// Wasabi S3-Compatible Storage Client
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Wasabi configuration
const WASABI_ACCESS_KEY = process.env.WASABI_ACCESS_KEY_ID!;
const WASABI_SECRET_KEY = process.env.WASABI_SECRET_ACCESS_KEY!;
const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME!;
const WASABI_REGION = process.env.WASABI_REGION || 'ap-south-1'; // Default to Mumbai region
const WASABI_ENDPOINT = process.env.WASABI_ENDPOINT || `https://s3.${WASABI_REGION}.wasabisys.com`;

// Create S3 client configured for Wasabi
export const wasabiClient = new S3Client({
  region: WASABI_REGION,
  endpoint: WASABI_ENDPOINT,
  credentials: {
    accessKeyId: WASABI_ACCESS_KEY,
    secretAccessKey: WASABI_SECRET_KEY,
  },
  forcePathStyle: true, // Required for Wasabi
});

// Get the bucket name
export const getWasabiBucket = () => WASABI_BUCKET;

// Generate a unique file key with user folder structure
// Format: users/{userId}/files/{year}/{month}/{uniqueId}_{filename}
export function generateFileKey(userId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return `users/${userId}/files/${year}/${month}/${uniqueId}_${sanitizedFilename}`;
}

// Upload file to Wasabi
// Sanitize string for use in HTTP headers (S3 metadata)
function sanitizeForHeader(str: string): string {
  // Remove or replace characters that are invalid in HTTP headers
  // Only allow ASCII printable characters (32-126) excluding certain special chars
  return str.replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_');
}

export async function uploadToWasabi(
  userId: string,
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string
): Promise<{ key: string; url: string; size: number }> {
  const key = generateFileKey(userId, filename);
  
  // Sanitize filename for HTTP header metadata
  const safeFilename = sanitizeForHeader(filename);
  
  const command = new PutObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
    // Add metadata with sanitized values
    Metadata: {
      'user-id': userId,
      'original-filename': safeFilename,
      'uploaded-at': new Date().toISOString(),
    },
  });

  await wasabiClient.send(command);

  // Generate the public URL (or use signed URL for private files)
  const url = `${WASABI_ENDPOINT}/${WASABI_BUCKET}/${key}`;

  return {
    key,
    url,
    size: file.length,
  };
}

// Get a signed URL for temporary access (for private files)
export async function getSignedFileUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: key,
  });

  return getSignedUrl(wasabiClient, command, { expiresIn });
}

// Get a signed URL for uploading (presigned PUT)
export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ key: string; uploadUrl: string }> {
  const key = generateFileKey(userId, filename);
  
  const command = new PutObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: {
      'user-id': userId,
      'original-filename': filename,
    },
  });

  const uploadUrl = await getSignedUrl(wasabiClient, command, { expiresIn });

  return { key, uploadUrl };
}

// Delete file from Wasabi
export async function deleteFromWasabi(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    });

    await wasabiClient.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from Wasabi:', error);
    return false;
  }
}

// Check if file exists
export async function fileExistsInWasabi(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    });

    await wasabiClient.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

// Get file metadata
export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    });

    const response = await wasabiClient.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

// Download file from Wasabi
export async function downloadFromWasabi(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    });

    const response = await wasabiClient.send(command);
    
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      // @ts-ignore - Body is a readable stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    return null;
  } catch (error) {
    console.error('Error downloading from Wasabi:', error);
    return null;
  }
}

// Utility to check if Wasabi is properly configured
export function isWasabiConfigured(): boolean {
  return !!(WASABI_ACCESS_KEY && WASABI_SECRET_KEY && WASABI_BUCKET);
}
