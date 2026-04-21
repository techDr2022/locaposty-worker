import * as dotenv from "dotenv";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });
import { createServer } from "http";
import { connection } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { createPostWorker } from "./lib/workers/postWorker";
import { createReportWorker, reconcileScheduleTriggers } from "./lib/workers/reportWorker";
import type { Worker } from "bullmq";
import type { PostJobData } from "./lib/workers/postWorker";
import type { ReportJobData, ReportScheduleTriggerJobData } from "./lib/reportQueue";

console.log("======= LOCAPOSTY WORKER STARTING =======");
console.log("Environment:", process.env.NODE_ENV || "development");

const port = Number(process.env.REPORTS_WORKER_PORT || process.env.PORT || 3002);
const dbRetries = Number(process.env.DB_READY_RETRIES || 10);
const dbRetryDelayMs = Number(process.env.DB_READY_RETRY_DELAY_MS || 2000);

const server = createServer((req, res) => {
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

let postWorker: Worker<PostJobData> | null = null;
let reportWorker: Worker<ReportJobData | ReportScheduleTriggerJobData> | null =
  null;

async function waitForDB(retries = dbRetries): Promise<void> {
  for (let i = 0; i < retries; i += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[worker] DB connected");
      return;
    } catch {
      console.log(`[worker] Waiting for DB... attempt ${i + 1}/${retries}`);
      await new Promise((resolve) => setTimeout(resolve, dbRetryDelayMs));
    }
  }

  throw new Error("DB not reachable after retries");
}

server.listen(port, () => {
  console.log(`[worker] Health server listening on port ${port}`);
});

async function bootstrapWorkers() {
  await waitForDB();

  postWorker = createPostWorker();
  reportWorker = createReportWorker();

  await reconcileScheduleTriggers();
  console.log("[worker] Report schedules reconciled on startup");
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
