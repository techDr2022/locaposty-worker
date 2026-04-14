import axios from "axios";
import { Worker, Job } from "bullmq";
import { prisma } from "../prisma";
import { connection } from "../queue";
import { refreshLocationToken } from "../refreshLocationToken";
import { createLocationPhotoFromSourceUrl } from "../gmb/createLocationPhotoMedia";

export interface PostJobData {
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
}

const ACTION_TYPE_MAP: Record<string, string> = {
  LEARN_MORE: "LEARN_MORE",
  BOOK: "BOOK",
  ORDER: "ORDER",
  SHOP: "BUY",
  SIGN_UP: "SIGN_UP",
  CALL_NOW: "CALL",
  GET_DIRECTIONS: "DIRECTIONS",
};

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
    const actionType = ACTION_TYPE_MAP[callToActionType] ?? callToActionType;
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
            mediaFormat: url.toLowerCase().endsWith(".mp4") ? "VIDEO" : "PHOTO",
            sourceUrl: url,
          }))
        : undefined,
    event: eventDetails,
    offer: offerDetails,
  };
}

async function processPostJob(job: Job<PostJobData>): Promise<unknown> {
  const { postId } = job.data;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      location: { include: { googleAccount: true } },
    },
  });

  if (!post) throw new Error(`Post ${postId} not found`);
  if (post.status !== "SCHEDULED" && post.status !== "PUBLISHED") {
    console.log(`[post-worker] Post ${postId} not scheduled/published, skipping`);
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
    console.error("[post-worker] Token refresh failed:", tokenError);
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FAILED" },
    });
    throw new Error(
      `Authentication failed for location ${location.id}. Reconnect required.`
    );
  }

  const accountId = location.gmbAccountId.replace(/^accounts\//, "");
  const locationId = location.gmbLocationId.replace(/^locations\//, "");

  if (String(post.type) === "PHOTO") {
    const sourceUrl = post.mediaUrls[0];
    if (!sourceUrl) {
      throw new Error("Photo posts require at least one media URL");
    }

    const lowerUrl = sourceUrl.toLowerCase();
    const mediaFormat = lowerUrl.endsWith(".mp4") ? "VIDEO" : "PHOTO";

    const mediaResponse = await createLocationPhotoFromSourceUrl({
      accessToken,
      accountId,
      locationId,
      sourceUrl,
      category: ((post as { gmbMediaCategory?: string | null })
        .gmbMediaCategory ?? "ADDITIONAL") as
        | "CATEGORY_UNSPECIFIED"
        | "COVER"
        | "PROFILE"
        | "LOGO"
        | "EXTERIOR"
        | "INTERIOR"
        | "PRODUCT"
        | "AT_WORK"
        | "FOOD_AND_DRINK"
        | "MENU"
        | "COMMON_AREA"
        | "ROOMS"
        | "TEAMS"
        | "ADDITIONAL",
      mediaFormat,
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        gmbPhotoMediaName: mediaResponse.name ?? null,
      } as unknown as Parameters<typeof prisma.post.update>[0]["data"],
    });

    console.log(`[post-worker] Photo ${postId} published successfully`);
    return mediaResponse;
  }

  const postBody = buildPostBody(post);
  const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

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

  console.log(`[post-worker] Post ${postId} published successfully`);
  return response.data;
}

async function handlePostJobError(job: Job<PostJobData>, error: unknown) {
  let errorMessage = error instanceof Error ? error.message : "Unknown error";
  let errorCode = "UNKNOWN_ERROR";

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

  console.error(`[post-worker] ${errorMessage} (${errorCode})`);
  try {
    await prisma.post.update({
      where: { id: job.data.postId },
      data: { status: "FAILED" },
    });
  } catch (dbError) {
    console.error("[post-worker] Failed to update post status:", dbError);
  }
}

export function createPostWorker(): Worker<PostJobData> {
  const worker = new Worker<PostJobData>(
    "gmb-locaposty",
    async (job) => {
      try {
        console.log(`[post-worker] Processing job ${job.id}`);
        return await processPostJob(job);
      } catch (error) {
        await handlePostJobError(job, error);
        throw error;
      }
    },
    { connection }
  );

  worker.on("completed", (j) =>
    console.log(`[post-worker] Job ${j.id} completed`)
  );
  worker.on("failed", (j, err) =>
    console.error(`[post-worker] Job ${j?.id} failed:`, err.message)
  );
  worker.on("active", (j) => console.log(`[post-worker] Job ${j.id} started`));
  worker.on("stalled", (id) =>
    console.warn(`[post-worker] Job ${id} stalled`)
  );

  return worker;
}
