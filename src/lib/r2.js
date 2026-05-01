import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function uploadToR2(file, userId) {
  const s3 = getS3Client();
  const sanitized = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
  const key = `papers/${userId}/${Date.now()}-${sanitized}`;

  await s3.send(new PutObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: file.type,
  }));

  return {
    key,
    url: `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`,
  };
}

export async function deleteFromR2(imageUrl) {
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  if (!imageUrl || !publicUrl) return;
  const key = imageUrl.replace(publicUrl + '/', '');
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: key,
  }));
}
