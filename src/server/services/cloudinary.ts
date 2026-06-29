import { v2 as cloudinary } from 'cloudinary';

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

interface UploadResult {
  url: string;
  publicId: string;
  mocked: boolean;
}

/**
 * Uploads a base64 data URI (e.g. from a file input) to Cloudinary.
 *
 * Without Cloudinary credentials configured, returns a placeholder image URL
 * instead of failing — so profile photo / banner / logo uploads keep working
 * end to end during development.
 */
export async function uploadImage(dataUri: string, folder: string): Promise<UploadResult> {
  if (!isConfigured) {
    console.log(`[cloudinary:dev-mock] Skipping real upload for folder="${folder}".`);
    return {
      url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      publicId: `dev-mock-${Date.now()}`,
      mocked: true,
    };
  }

  const result = await cloudinary.uploader.upload(dataUri, { folder });
  return { url: result.secure_url, publicId: result.public_id, mocked: false };
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!isConfigured || publicId.startsWith('dev-mock-')) return;
  await cloudinary.uploader.destroy(publicId);
}
