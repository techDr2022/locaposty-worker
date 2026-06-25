import * as dotenv from "dotenv";
dotenv.config();
import { Queue } from "bullmq";
import IORedis from "ioredis";

function createRedisConnection(): IORedis {
  const sharedOptions = {
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };

  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, sharedOptions);
  }

  return new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    ...sharedOptions,
  });
}

const connection = createRedisConnection();

// Test connection
connection.on("connect", () => {
  console.log(
    "[REDIS] Successfully connected to Redis",
    process.env.REDIS_URL ? "(REDIS_URL)" : `at ${process.env.REDIS_HOST}`,
  );
});

connection.on("error", (err: Error) => {
  console.error("[REDIS ERROR]", err);
});

// Redis-based job tracking functions
const PROCESSED_JOBS_KEY = "gmb:processed_posts";
const PROCESSED_JOBS_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// Create GMB post queue with delayed job processing enabled
export const postQueue = new Queue("gmb-locaposty", {
  connection,
});

// Queue events such as active/completed/failed are emitted by QueueEvents/Worker.
// We keep queue creation lean here and log lifecycle in worker processes.

// Helper function to check if a post has been processed
export async function isPostProcessed(postId: string): Promise<boolean> {
  const result = Boolean(
    await connection.sismember(PROCESSED_JOBS_KEY, postId),
  );
  console.log(`[DEBUG] Checking if post ${postId} is processed: ${result}`);
  return result;
}

// Helper function to mark a post as processed
export async function markPostAsProcessed(postId: string): Promise<void> {
  await connection.sadd(PROCESSED_JOBS_KEY, postId);
  await connection.expire(PROCESSED_JOBS_KEY, PROCESSED_JOBS_TTL);
}

// Helper function to remove a post from processed set
export async function unmarkPostAsProcessed(postId: string): Promise<void> {
  await connection.srem(PROCESSED_JOBS_KEY, postId);
}

export async function schedulePost(
  postId: string,
  scheduledDate: Date,
  userEmail: string,
): Promise<void> {
  const now = new Date();
  const delay = Math.max(0, scheduledDate.getTime() - now.getTime());

  try {
    // First check if there's already a job for this post
    const existingJob = await postQueue.getJob(`post-${postId}`);
    if (existingJob) {
      console.log(
        `[BullMQ] Post ${postId} already has job ${existingJob.id}, removing it first`,
      );
      await existingJob.remove();
    }

    // Remove this post from the processed list
    await unmarkPostAsProcessed(postId);

    const job = await postQueue.add(
      "publish-post",
      { postId, userEmail },
      {
        delay,
        jobId: `post-${postId}`,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      },
    );
    console.log(
      `[BullMQ] Job ${job.id} created for post ${postId} scheduled for ${scheduledDate.toISOString()} with delay ${delay}ms`,
    );
    return;
  } catch (error) {
    console.error(`[BullMQ] Failed to schedule post ${postId}:`, error);
    throw error;
  }
}

// Helper function to remove a post from the queue
export async function unschedulePost(postId: string): Promise<void> {
  try {
    const job = await postQueue.getJob(`post-${postId}`);
    if (job) {
      await job.remove();
      console.log(`Post ${postId} removed from queue`);
    } else {
      console.log(`No scheduled job found for post ${postId}`);
    }
  } catch (error) {
    console.error(`Failed to unschedule post ${postId}:`, error);
    throw error;
  }
}

// Helper function to update a post in the queue
export async function reschedulePost(
  postId: string,
  newScheduledDate: Date,
  userEmail: string,
): Promise<void> {
  try {
    // First remove the existing job
    await unschedulePost(postId);

    // Remove from processed list
    await unmarkPostAsProcessed(postId);

    // Then add it again with the new time
    await schedulePost(postId, newScheduledDate, userEmail);

    console.log(
      `Post ${postId} rescheduled for ${newScheduledDate.toISOString()}`,
    );
  } catch (error) {
    console.error(`Failed to reschedule post ${postId}:`, error);
    throw error;
  }
}

// ─── Extended job data types ──────────────────────────────────────────────────

export interface ProcessReviewJobData {
  jobType: "process-review";
  reviewPath: string; // accounts/{}/locations/{}/reviews/{}
  eventType: string;
  messageId: string;
}

export interface SaveLocationsJobData {
  jobType: "save-locations";
  backgroundJobId: string;
  userId: string;
  accountId: string;
  locations: unknown[];
  googleAccountId: string;
}

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

export async function enqueueReviewProcessing(
  data: Omit<ProcessReviewJobData, "jobType">,
): Promise<void> {
  await postQueue.add(
    "process-review",
    { jobType: "process-review", ...data },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  );
}

export async function enqueueSaveLocations(
  data: Omit<SaveLocationsJobData, "jobType">,
): Promise<void> {
  await postQueue.add(
    "save-locations",
    { jobType: "save-locations", ...data },
    {
      jobId: `save-locations-${data.backgroundJobId}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
    },
  );
}

export { connection };
