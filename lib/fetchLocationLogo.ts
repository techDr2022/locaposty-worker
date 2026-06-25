import { OAuth2Client } from "google-auth-library";

// Define the MediaItem interface based on Google My Business API v4
interface MediaItem {
  name: string;
  mediaFormat: string;
  locationAssociation?: {
    category?: string;
  };
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime?: string;
  dimensions?: {
    widthPixels?: number;
    heightPixels?: number;
  };
  description?: string;
}

interface MediaListResponse {
  mediaItems?: MediaItem[];
  totalMediaItemCount?: number;
  nextPageToken?: string;
}

/**
 * Fetches the logo URL for a Google My Business location using the Media API
 * @param locationName - The full resource name (e.g., "accounts/123/locations/456")
 *   Must include the account ID prefix. Do not pass just "locations/456" - this will fail.
 * @param accessToken - Valid Google access token
 * @returns The Google URL of the logo image, or null if not found
 */
export async function fetchLocationLogoUrl(
  locationName: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log(`Fetching logo for location: ${locationName}`);

    let pageToken: string | undefined;
    const allMediaItems: MediaItem[] = [];

    // Handle pagination to get all media items
    do {
      const mediaUrl = `https://mybusiness.googleapis.com/v4/${locationName}/media`;
      const params = new URLSearchParams({
        pageSize: "100", // Maximum allowed page size
      });

      if (pageToken) {
        params.append("pageToken", pageToken);
      }

      const response = await fetch(`${mediaUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Media API error for ${locationName}:`,
          response.status,
          errorText
        );
        throw new Error(
          `Media API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data: MediaListResponse = await response.json();
      console.log(
        `Found ${data.mediaItems?.length || 0} media items for ${locationName}`
      );

      if (data.mediaItems) {
        allMediaItems.push(...data.mediaItems);
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log(`Total media items found: ${allMediaItems.length}`);

    // Filter for LOGO category first, then PROFILE category
    const logoMediaItem = allMediaItems.find(
      (item) => item.locationAssociation?.category === "LOGO"
    );

    const profileMediaItem = allMediaItems.find(
      (item) => item.locationAssociation?.category === "PROFILE"
    );

    // Prefer LOGO over PROFILE
    const selectedMediaItem = logoMediaItem || profileMediaItem;

    if (selectedMediaItem) {
      const logoUrl =
        selectedMediaItem.googleUrl || selectedMediaItem.thumbnailUrl;
      if (logoUrl) {
        console.log(
          `Found ${logoMediaItem ? "LOGO" : "PROFILE"} image for ${locationName}: ${logoUrl}`
        );
        return logoUrl;
      }
    }

    console.log(`No LOGO or PROFILE image found for ${locationName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching logo for ${locationName}:`, error);
    // Don't throw - return null to allow the process to continue
    return null;
  }
}

/**
 * Helper function to refresh access token if needed
 * @param refreshToken - Google refresh token
 * @returns Fresh access token
 */
export async function getFreshAccessToken(
  refreshToken: string
): Promise<string> {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID_GMB,
      process.env.GOOGLE_CLIENT_SECRET_GMB,
      `${process.env.NEXTAUTH_URL}/api/google/auth/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }

    return credentials.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}
