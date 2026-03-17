import * as dotenv from "dotenv";
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });
import express, { Request, Response } from "express";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

import { PrismaClient } from "./lib/generated/prisma/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

interface JobData {
  postId: string;
  userId: string;
}

interface GmbScheduleDate {
  year: number;
  month: number;
  day: number;
}

interface GmbScheduleTime {
  hours: number;
  minutes: number;
  seconds: number;
  nanos: number;
}

interface GmbEventDetails {
  title?: string;
  schedule?: {
    startDate: GmbScheduleDate;
    startTime: GmbScheduleTime;
    endDate?: GmbScheduleDate;
    endTime?: GmbScheduleTime;
  };
}

interface GmbOfferDetails {
  couponCode?: string;
  redeemOnlineUrl?: string;
  termsConditions?: string;
}

interface GmbCallToAction {
  actionType: string;
  url?: string;
}

interface GmbPostBody {
  languageCode: string;
  summary: string;
  topicType: string;
  callToAction?: GmbCallToAction;
  media?: Array<{ mediaFormat: string; sourceUrl: string }>;
  event?: GmbEventDetails;
  offer?: GmbOfferDetails;
}

interface GmbAxiosError {
  response?: {
    status: number;
    data: { error?: { message?: string }; [key: string]: unknown };
  };
  request?: unknown;
  message?: string;
}

// CTA type mapping: our values → Google's format
const ACTION_TYPE_MAP: Record<string, string> = {
  LEARN_MORE: "LEARN_MORE",
  BOOK: "BOOK",
  ORDER: "ORDER",
  SHOP: "BUY",
  SIGN_UP: "SIGN_UP",
  CALL_NOW: "CALL",
  GET_DIRECTIONS: "DIRECTIONS",
};

// ─── Helpers (pure, no Prisma) ─────────────────────────────────────────────

function toGmbSchedulePart(date: Date): {
  date: GmbScheduleDate;
  time: GmbScheduleTime;
} {
  return {
    date: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    },
    time: {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      nanos: date.getMilliseconds() * 1_000_000,
    },
  };
}

function buildEventDetails(
  title: string,
  startDate: Date,
  endDate: Date,
  hasEnd: boolean
): GmbEventDetails {
  const start = toGmbSchedulePart(startDate);
  const end = toGmbSchedulePart(endDate);
  return {
    title,
    schedule: {
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: hasEnd ? end.time : undefined,
    },
  };
}

// ─── Worker bootstrap ──────────────────────────────────────────────────────

console.log("======= WORKER STARTING =======");
console.log("Environment:", process.env.NODE_ENV || "development");

try {
  const prisma = new PrismaClient();
  const app = express();
  const port = process.env.PORT || 3001;

  app.get("/ping", (_req: Request, res: Response) => {
    res.send("pong");
  });
  app.listen(port, () => {
    console.log(`Worker server listening on port ${port}`);
  });

  const redisOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };

  const connection = new IORedis(redisOptions);
  connection.on("connect", () => console.log("Successfully connected to Redis"));
  connection.on("error", (err) => console.error("Redis connection error:", err));
  connection.ping().then(
    () => console.log("Redis PING successful"),
    (err) => console.error("Redis PING failed:", err)
  );

  // ─── Token refresh (inlined, no lib import) ───────────────────────────────

  async function refreshGoogleAccountToken(
    googleAccountId: string
  ): Promise<string> {
    const googleAccount = await prisma.googleAccount.findUnique({
      where: { id: googleAccountId },
    });
    if (!googleAccount) {
      throw new Error(`GoogleAccount ${googleAccountId} not found`);
    }
    if (!googleAccount.refreshToken) {
      throw new Error(
        `No refresh token found for GoogleAccount ${googleAccountId}`
      );
    }

    if (googleAccount.accessToken && googleAccount.tokenExpiresAt) {
      const expiryDate = new Date(googleAccount.tokenExpiresAt);
      if (expiryDate > new Date(Date.now() + 5 * 60 * 1000)) {
        return googleAccount.accessToken;
      }
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID_GMB,
      process.env.GOOGLE_CLIENT_SECRET_GMB,
      `${process.env.NEXTAUTH_URL}/api/google/auth/callback`
    );
    oauth2Client.setCredentials({
      refresh_token: googleAccount.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (!credentials.access_token) {
        throw new Error(
          `Failed to refresh access token for GoogleAccount ${googleAccountId}`
        );
      }
      const expiryTime = new Date(
        credentials.expiry_date ?? Date.now() + 60 * 60 * 1000
      );
      await prisma.googleAccount.update({
        where: { id: googleAccountId },
        data: {
          accessToken: credentials.access_token,
          tokenExpiresAt: expiryTime,
          updatedAt: new Date(),
        },
      });
      return credentials.access_token;
    } catch {
      await prisma.googleAccount.update({
        where: { id: googleAccountId },
        data: { accessToken: "", tokenExpiresAt: null },
      });
      throw new Error(
        "Token refresh failed. The Google account needs to be re-authenticated."
      );
    }
  }

  async function refreshLocationToken(locationId: string): Promise<string> {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { googleAccount: true },
    });
    if (!location) throw new Error(`Location ${locationId} not found`);
    if (!location.googleAccountId || !location.googleAccount) {
      throw new Error(
        `Location ${locationId} is not linked to a GoogleAccount. Please reconnect the location.`
      );
    }
    return refreshGoogleAccountToken(location.googleAccountId);
  }

  // ─── Job processor ───────────────────────────────────────────────────────

  async function processJob(job: Job<JobData>): Promise<unknown> {
    const { postId } = job.data;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        location: { include: { googleAccount: true } },
      },
    });
    if (!post) throw new Error(`Post ${postId} not found`);
    if (post.status !== "SCHEDULED" && post.status !== "PUBLISHED") {
      console.log(`[WORKER] Post ${postId} not scheduled/published, skipping`);
      return;
    }

    const location = post.location;
    if (!location?.gmbLocationId) {
      throw new Error(`No GMB location found for post ${postId}`);
    }
    if (!location.gmbAccountId) {
      throw new Error(`No GMB account ID for location ${location.id}`);
    }
    if (!location.googleAccountId) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED" },
      });
      throw new Error(
        `Location ${location.id} not linked to GoogleAccount. Please reconnect.`
      );
    }

    let accessToken: string;
    try {
      accessToken = await refreshLocationToken(location.id);
    } catch (tokenError) {
      console.error(`[WORKER] Token refresh failed:`, tokenError);
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED" },
      });
      throw new Error(
        `Authentication failed for location ${location.id}. Reconnect required.`
      );
    }

    const postBody = buildPostBody(post);
    const accountId = location.gmbAccountId.replace(/^accounts\//, "");
    const locationId = location.gmbLocationId.replace(/^locations\//, "");
    const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

    console.log(`[WORKER] Sending post to GMB: ${apiUrl}`);
    const response = await axios.post(apiUrl, postBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        gmbPostName: response.data.name,
      },
    });

    console.log(`[WORKER] Post ${postId} published successfully`);
    return response.data;
  }

  function buildPostBody(post: {
    type: string | null;
    title: string | null;
    content: string;
    callToAction: string | null;
    ctaUrl: string | null;
    mediaUrls: string[];
    eventStart: Date | null;
    eventEnd: Date | null;
    couponCode: string | null;
    redeemOnlineUrl: string | null;
    termsAndConditions: string | null;
    offerStart: Date | null;
    offerEnd: Date | null;
  }): GmbPostBody {
    let topicType = "STANDARD";
    let eventDetails: GmbEventDetails | undefined;
    let offerDetails: GmbOfferDetails | undefined;

    if (post.type === "EVENT" && post.eventStart) {
      topicType = "EVENT";
      const startDate = new Date(post.eventStart);
      const endDate = post.eventEnd ? new Date(post.eventEnd) : startDate;
      eventDetails = buildEventDetails(
        post.title ?? "",
        startDate,
        endDate,
        !!post.eventEnd
      );
    } else if (post.type === "OFFER") {
      topicType = "OFFER";
      offerDetails = {
        couponCode: post.couponCode ?? undefined,
        redeemOnlineUrl: post.redeemOnlineUrl ?? undefined,
        termsConditions: post.termsAndConditions ?? undefined,
      };
      if (post.offerStart) {
        const startDate = new Date(post.offerStart);
        const endDate = post.offerEnd ? new Date(post.offerEnd) : startDate;
        eventDetails = buildEventDetails(
          post.title ?? "",
          startDate,
          endDate,
          !!post.offerEnd
        );
      }
    }

    const callToActionType = post.callToAction ?? undefined;
    let callToActionObj: GmbCallToAction | undefined;
    if (callToActionType && callToActionType !== "NONE") {
      const actionType =
        ACTION_TYPE_MAP[callToActionType] ?? callToActionType;
      callToActionObj = {
        actionType,
        ...(post.ctaUrl && callToActionType !== "CALL_NOW"
          ? { url: post.ctaUrl }
          : {}),
      };
    }

    return {
      languageCode: "en-US",
      summary: post.content,
      topicType,
      callToAction: callToActionObj,
      media:
        post.mediaUrls.length > 0
          ? post.mediaUrls.map((url) => ({
              mediaFormat: url.toLowerCase().endsWith(".mp4")
                ? "VIDEO"
                : "PHOTO",
              sourceUrl: url,
            }))
          : undefined,
      event: eventDetails,
      offer: offerDetails,
    };
  }

  async function handleJobError(
    job: Job<JobData>,
    error: unknown
  ): Promise<void> {
    let errorMessage = "Unknown error";
    let errorCode = "UNKNOWN_ERROR";

    if (error instanceof Error) errorMessage = error.message;

    const axiosErr = error as GmbAxiosError;
    if (axiosErr.response) {
      const { status, data } = axiosErr.response;
      errorMessage = `GMB API Error (${status}): ${
        data.error?.message ?? JSON.stringify(data)
      }`;
      if (status === 401 || status === 403) errorCode = "AUTH_ERROR";
      else if (status === 400) errorCode = "INVALID_REQUEST";
      else if (status === 404) errorCode = "RESOURCE_NOT_FOUND";
      else if (status >= 500) errorCode = "GMB_SERVER_ERROR";
    } else if (axiosErr.request) {
      errorMessage = "No response from GMB API";
      errorCode = "NETWORK_ERROR";
    }

    console.error(`[WORKER ERROR] ${errorMessage} (${errorCode})`);
    try {
      await prisma.post.update({
        where: { id: job.data.postId },
        data: { status: "FAILED" },
      });
    } catch (dbError) {
      console.error("[WORKER ERROR] Failed to update post status:", dbError);
    }
  }

  // ─── Worker and handlers ─────────────────────────────────────────────────

  const worker = new Worker<JobData>(
    "gmb-locaposty",
    async (job: Job<JobData>) => {
      try {
        console.log(`[WORKER] Processing job ${job.id}: ${JSON.stringify(job.data)}`);
        return await processJob(job);
      } catch (error) {
        await handleJobError(job, error);
        throw error;
      }
    },
    { connection }
  );

  worker.on("completed", (j) =>
    console.log(`[BullMQ] Job ${j.id} completed`, j.data)
  );
  worker.on("failed", (j, err) =>
    console.error(`[BullMQ] Job ${j?.id} failed:`, err.message)
  );
  worker.on("active", (j) =>
    console.log(`[BullMQ] Job ${j.id} started`)
  );
  worker.on("stalled", (id) =>
    console.warn(`[BullMQ] Job ${id} stalled`)
  );

  const shutdown = async () => {
    console.log("Shutting down worker...");
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("Worker started for queue: gmb-locaposty");
} catch (error) {
  console.error("Worker initialization failed:", error);
  process.exit(1);
}
