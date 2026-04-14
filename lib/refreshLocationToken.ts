import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";

export async function refreshGoogleAccountToken(
  googleAccountId: string
): Promise<string> {
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { id: googleAccountId },
  });

  if (!googleAccount) {
    throw new Error(`GoogleAccount ${googleAccountId} not found`);
  }
  if (!googleAccount.refreshToken) {
    throw new Error(`No refresh token found for GoogleAccount ${googleAccountId}`);
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
  } catch (error) {
    await prisma.googleAccount.update({
      where: { id: googleAccountId },
      data: { accessToken: "", tokenExpiresAt: null },
    });
    throw error;
  }
}

export async function refreshLocationToken(locationId: string): Promise<string> {
  try {
    console.log(`[TOKEN] Fetching tokens for location ${locationId}`);

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { googleAccount: true },
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    if (!location.googleAccountId || !location.googleAccount) {
      throw new Error(
        `Location ${locationId} is not linked to a GoogleAccount. Please reconnect the location.`
      );
    }

    console.log(
      `[TOKEN] Using GoogleAccount ${location.googleAccountId} for location ${locationId}`
    );
    return refreshGoogleAccountToken(location.googleAccountId);
  } catch (error) {
    console.error(
      `[TOKEN ERROR] Failed to refresh token for location ${locationId}:`,
      error
    );
    throw error;
  }
}
