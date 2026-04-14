import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

/**
 * Uploads a file to S3 and returns the URL
 *
 * @param file The file to upload
 * @param folder Optional folder path within the bucket
 * @returns The URL of the uploaded file
 */
export async function uploadToS3(
  file: File,
  folder = "posts"
): Promise<string> {
  // Generate a unique filename
  const timestamp = Date.now();
  const fileExtension = file.name.split(".").pop() || "";
  const sanitizedFileName = file.name
    .split(".")[0]
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const fileName = `${folder}/${sanitizedFileName}-${timestamp}.${fileExtension}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
    ACL: "public-read", // Make the file publicly accessible
  });

  await s3Client.send(command);

  // Return the URL of the uploaded file
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
}

/**
 * Uploads a raw buffer (e.g. PDF) to S3 and returns the public URL.
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

/**
 * Extracts filename from S3 URL
 *
 * @param url S3 URL
 * @returns Filename
 */
export function getFileNameFromS3Url(url: string): string {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  return pathname.split("/").pop() || "";
}

/**
 * Downloads an image from a URL and uploads it to S3
 *
 * @param imageUrl The URL of the image to download
 * @param fileName Base filename for the S3 object
 * @param folder Optional folder path within the bucket
 * @returns The S3 URL of the uploaded image
 */
export async function downloadAndUploadToS3(
  imageUrl: string,
  fileName: string,
  folder = "location-logos"
): Promise<string> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);

    // Fetch the image from the URL
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }

    // Get the content type from the response headers
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = contentType.split("/")[1] || "jpg";
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();
    const s3Key = `${folder}/${sanitizedFileName}-${timestamp}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      // ACL removed - bucket doesn't allow ACLs
    });

    await s3Client.send(command);

    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
    console.log(`Successfully uploaded image to S3: ${s3Url}`);

    return s3Url;
  } catch (error) {
    console.error("Error downloading and uploading image to S3:", error);
    throw error;
  }
}

/**
 * Creates a presigned URL for direct browser uploads to S3
 *
 * @param fileName Destination filename in S3
 * @param contentType MIME type of the file
 * @param folder Optional folder path within the bucket
 * @returns Presigned URL and the final S3 URL of the file
 */
export async function getPresignedUrl(
  fileName: string,
  contentType: string,
  folder = "posts"
): Promise<{
  presignedUrl: string;
  fileUrl: string;
}> {
  // Generate a unique filename
  const timestamp = Date.now();
  const fileExtension = fileName.split(".").pop() || "";
  const sanitizedFileName = fileName
    .split(".")[0]
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const key = `${folder}/${sanitizedFileName}-${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  // Generate the presigned URL
  const signedUrl = await s3Client.send(command);

  return {
    presignedUrl: signedUrl.toString(),
    fileUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
  };
}
