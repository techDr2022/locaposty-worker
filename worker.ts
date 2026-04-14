import * as dotenv from "dotenv";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });
import { createServer } from "http";
import { connection } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { createPostWorker } from "./lib/workers/postWorker";
import { createReportWorker, reconcileScheduleTriggers } from "./lib/workers/reportWorker";

console.log("======= LOCAPOSTY WORKER STARTING =======");
console.log("Environment:", process.env.NODE_ENV || "development");

const port = Number(process.env.REPORTS_WORKER_PORT || process.env.PORT || 3002);

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

const postWorker = createPostWorker();
const reportWorker = createReportWorker();

server.listen(port, () => {
  console.log(`[worker] Health server listening on port ${port}`);
});

void reconcileScheduleTriggers()
  .then(() => {
    console.log("[worker] Report schedules reconciled on startup");
  })
  .catch((err) => {
    console.error("[worker] Failed to reconcile report schedules:", err);
  });

const shutdown = async () => {
  console.log("[worker] Shutting down...");

  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await Promise.all([postWorker.close(), reportWorker.close()]);
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
