import { Job } from "bullmq";
import { downloadAndUploadToS3 } from "../s3";
import { fetchLocationLogoUrl } from "../fetchLocationLogo";
import { prisma } from "../prisma";
import type { SaveLocationsJobData } from "../queue";
import { registerGBPNotifications } from "../registerGBPNotifications";
import { refreshGoogleAccountToken } from "../refreshLocationToken";
import { safeDb } from "../safeDb";

interface GMBLocation {
  name: string;
  title?: string;
  logoUrl?: string | null;
  storefrontAddress?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
  };
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  latlng?: { latitude: number; longitude: number };
  profile?: {
    logoUrl?: string;
    coverPhoto?: { url?: string };
    photos?: Array<{ url?: string }>;
  };
}

export async function processSaveLocations(
  job: Job<SaveLocationsJobData>,
): Promise<void> {
  const { backgroundJobId, userId, accountId, locations, googleAccountId } =
    job.data;

  console.log(
    `[save-locations-worker] jobId=${backgroundJobId} count=${locations.length}`,
  );

  await safeDb(() =>
    prisma.backgroundJob.update({
      where: { id: backgroundJobId },
      data: { status: "PROCESSING" },
    }),
  );

  try {
    const accessToken = await refreshGoogleAccountToken(googleAccountId);

    const locationList = locations as GMBLocation[];
    const locationIds = locationList
      .map((loc) => {
        const p = loc.name.split("/");
        return p[p.length - 1];
      })
      .filter((id): id is string => !!id);

    const existingLocations = await safeDb(() =>
      prisma.location.findMany({
        where: { gmbLocationId: { in: locationIds } },
        select: { id: true, gmbLocationId: true, logoUrl: true },
      }),
    );
    const existingByGmbId = new Map(
      existingLocations.map((loc) => [loc.gmbLocationId, loc]),
    );

    const savedLocationIds: string[] = [];

    for (const location of locationList) {
      try {
        const locationPathParts = location.name.split("/");
        const locationId = locationPathParts[locationPathParts.length - 1];
        if (!locationId) {
          console.error(
            `[save-locations-worker] Invalid location name: ${location.name}`,
          );
          continue;
        }

        const existingLocation = existingByGmbId.get(locationId);

        let logoUrl: string | null = null;

        if (existingLocation?.logoUrl) {
          logoUrl = existingLocation.logoUrl;
        } else if (location.logoUrl) {
          try {
            logoUrl = await downloadAndUploadToS3(
              location.logoUrl,
              `location-${locationId}`,
              "location-logos",
            );
          } catch (err) {
            console.error(
              `[save-locations-worker] Logo upload from frontend URL failed for ${locationId}:`,
              err,
            );
          }
        }

        if (!logoUrl) {
          try {
            const fullLocationName = accountId.startsWith("accounts/")
              ? `${accountId}/locations/${locationId}`
              : `accounts/${accountId}/locations/${locationId}`;
            const logoGoogleUrl = await fetchLocationLogoUrl(
              fullLocationName,
              accessToken,
            );
            if (logoGoogleUrl) {
              logoUrl = await downloadAndUploadToS3(
                logoGoogleUrl,
                `location-${locationId}`,
                "location-logos",
              );
            }
          } catch (err) {
            console.error(
              `[save-locations-worker] Logo fetch failed for ${locationId}:`,
              err,
            );
            logoUrl =
              location.profile?.logoUrl ||
              location.profile?.coverPhoto?.url ||
              (location.profile?.photos?.length
                ? (location.profile.photos[0].url ?? null)
                : null) ||
              null;
          }
        }

        const locationAddress = location.storefrontAddress
          ? `${location.storefrontAddress.addressLines.join(", ")}, ${location.storefrontAddress.locality}, ${location.storefrontAddress.administrativeArea} ${location.storefrontAddress.postalCode}`
          : null;

        let savedId: string;
        if (existingLocation) {
          const updated = await safeDb(() =>
            prisma.location.update({
              where: { id: existingLocation.id },
              data: {
                name: location.title || "",
                gmbLocationName: location.title || "",
                address: locationAddress,
                phone: location.phoneNumbers?.primaryPhone || null,
                websiteUrl: location.websiteUri || null,
                logoUrl,
                latitude: location.latlng?.latitude || null,
                longitude: location.latlng?.longitude || null,
                googleAccountId,
                lastSyncedAt: new Date(),
                gmbAccountId: accountId,
                users: { connect: { id: userId } },
              },
            }),
          );
          savedId = updated.id;
        } else {
          const created = await safeDb(() =>
            prisma.location.create({
              data: {
                gmbLocationId: locationId,
                name: location.title || "",
                gmbLocationName: location.title || "",
                address: locationAddress,
                phone: location.phoneNumbers?.primaryPhone || null,
                websiteUrl: location.websiteUri || null,
                logoUrl,
                latitude: location.latlng?.latitude || null,
                longitude: location.latlng?.longitude || null,
                googleAccountId,
                lastSyncedAt: new Date(),
                gmbAccountId: accountId,
                users: { connect: { id: userId } },
              },
            }),
          );
          savedId = created.id;
        }

        savedLocationIds.push(savedId);
        console.log(
          `[save-locations-worker] Saved location ${locationId} → DB id ${savedId}`,
        );
      } catch (err) {
        console.error(`[save-locations-worker] Failed to save location:`, err);
      }
    }

    try {
      const googleAccount = await safeDb(() =>
        prisma.googleAccount.findUnique({
          where: { id: googleAccountId },
          include: {
            user: {
              include: {
                subscriptions: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        }),
      );
      const activeSub = googleAccount?.user?.subscriptions?.find(
        (s) => s.status === "ACTIVE" || s.status === "TRIALING",
      );

      if (
        googleAccount &&
        !googleAccount.notificationRegistered &&
        (activeSub?.plan === "PREMIUM" || activeSub?.plan === "ENTERPRISE")
      ) {
        await registerGBPNotifications(
          googleAccountId,
          accountId,
          accessToken,
        );
        console.log(
          `[save-locations-worker] Pub/Sub registered for account ${accountId}`,
        );
      }
    } catch (err) {
      console.error(`[save-locations-worker] Pub/Sub registration failed:`, err);
    }

    await safeDb(() =>
      prisma.user.update({
        where: { id: userId },
        data: { hasCompletedLocationSetup: true },
      }),
    );

    const user = await safeDb(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { hasCompletedReviewSetup: true },
      }),
    );

    await safeDb(() =>
      prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: "COMPLETED",
          result: {
            locationIds: savedLocationIds,
            savedCount: savedLocationIds.length,
            totalCount: locationList.length,
            shouldShowReviewWizard: !user?.hasCompletedReviewSetup,
          },
        },
      }),
    );

    console.log(
      `[save-locations-worker] done — saved ${savedLocationIds.length}/${locationList.length}`,
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[save-locations-worker] failed:`, err);
    await safeDb(() =>
      prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: { status: "FAILED", error: errorMsg },
      }),
    );
    throw err;
  }
}
