import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  // Credentials: uses default chain (env vars for local dev, IAM role on EC2)
});

/**
 * Derive an S3 key from server-controlled inputs only.
 * Format: profiles/<reportId>/<uuid>.<ext>
 * Never uses the original filename directly.
 */
export function getS3Key(reportId, originalname) {
  const rawExt = path.extname(originalname).toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
  return `profiles/${reportId}/${crypto.randomUUID()}${ext}`;
}

/**
 * Upload a single file buffer to S3.
 * Returns the S3 key on success.
 * Throws on upload failure (caller handles partial-failure logging per BR-S3-02).
 */
export async function uploadToS3(reportId, file) {
  if (!file.mimetype.startsWith('image/')) {
    throw new Error(`Rejected non-image file type: ${file.mimetype}`);
  }

  const bucket = process.env.S3_IMAGES_BUCKET;
  if (!bucket) {
    throw new Error('S3_IMAGES_BUCKET environment variable is not set');
  }

  const key = getS3Key(reportId, file.originalname);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return { key, bucket };
}
