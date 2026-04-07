import axios from "axios";

type MediaFormat = "PHOTO" | "VIDEO";

export type GmbMediaCategory =
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
  | "ADDITIONAL";

type CreateLocationPhotoParams = {
  accessToken: string;
  accountId: string;
  locationId: string;
  sourceUrl: string;
  category: GmbMediaCategory;
  mediaFormat: MediaFormat;
};

export type CreateLocationPhotoResult = {
  name?: string;
  googleUrl?: string;
  sourceUrl?: string;
};

export async function createLocationPhotoFromSourceUrl(
  params: CreateLocationPhotoParams,
): Promise<CreateLocationPhotoResult> {
  const accountId = params.accountId.replace(/^accounts\//, "");
  const locationId = params.locationId.replace(/^locations\//, "");

  const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
  const { data } = await axios.post<CreateLocationPhotoResult>(
    apiUrl,
    {
      mediaFormat: params.mediaFormat,
      sourceUrl: params.sourceUrl,
      locationAssociation: {
        category: params.category,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  return data;
}
