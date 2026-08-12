import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type UploadResourceType = "image" | "video";

/** Streams a memory buffer (from multer) straight to Cloudinary — no temp files on disk. */
export function uploadBuffer(buffer: Buffer, resourceType: UploadResourceType): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "bob/jobs", resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ url: result.secure_url });
      }
    );
    stream.end(buffer);
  });
}
