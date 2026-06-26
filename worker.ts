import * as dotenv from "dotenv";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });
import { createServer } from "http";
import { connection, getPostQueueStats, waitForRedisReady } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { logWorkerTargets, getRedisTarget, getDatabaseHost } from "./lib/env";
import { createPostWorker } from "./lib/workers/postWorker";
import { createReportWorker, reconcileScheduleTriggers } from "./lib/workers/reportWorker";
import type { Worker } from "bullmq";
import type { GmbJobData } from "./lib/workers/postWorker";
import type { ReportJobData, ReportScheduleTriggerJobData } from "./lib/reportQueue";

console.log("======= LOCAPOSTY WORKER STARTING =======");
console.log("Environment:", process.env.NODE_ENV || "development");
logWorkerTargets();

const port = Number(process.env.REPORTS_WORKER_PORT || process.env.PORT || 3002);
const dbRetries = Number(process.env.DB_READY_RETRIES || 10);
const dbRetryDelayMs = Number(process.env.DB_READY_RETRY_DELAY_MS || 2000);

let postWorker: Worker<GmbJobData> | null = null;
let reportWorker: Worker<ReportJobData | ReportScheduleTriggerJobData> | null =
  null;
let workersReady = false;

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    try {
      const [queue, scheduledPosts] = await Promise.all([
        getPostQueueStats(),
        prisma.post.count({ where: { status: "SCHEDULED" } }),
      ]);
      const redis = getRedisTarget();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          workersReady,
          redis: `${redis.host}:${redis.port}`,
          database: getDatabaseHost(),
          scheduledPostsInDb: scheduledPosts,
          queue,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: message }));
    }
    return;
  }

  if (req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong");
    return;
  }

  if (req.url === "/ping-post") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong-post");
    return;
  }

  if (req.url === "/ping-reports") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong-reports");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

async function waitForDB(retries = dbRetries): Promise<void> {
  let lastError: unknown;

  for (let i = 0; i < retries; i += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[worker] DB connected");
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[worker] Waiting for DB... attempt ${i + 1}/${retries}: ${message}`,
      );
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, dbRetryDelayMs));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "DB not reachable after retries";
  throw new Error(message);
}

server.listen(port, () => {
  console.log(`[worker] Health server listening on port ${port}`);
});

async function bootstrapWorkers() {
  await waitForDB();
  await waitForRedisReady();

  postWorker = createPostWorker();
  reportWorker = createReportWorker();

  await reconcileScheduleTriggers();
  workersReady = true;
  console.log("[worker] Report schedules reconciled on startup");
  console.log("[worker] All workers bootstrapped and listening");
}

void bootstrapWorkers().catch((err) => {
  console.error("[worker] Startup failed:", err);
  process.exit(1);
});

const shutdown = async () => {
  console.log("[worker] Shutting down...");

  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (postWorker && reportWorker) {
    await Promise.all([postWorker.close(), reportWorker.close()]);
  }
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
