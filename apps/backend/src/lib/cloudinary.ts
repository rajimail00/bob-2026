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


interface CloudinaryAssetDetails {
  publicId: string;
  resourceType: UploadResourceType;
}

function parseCloudinaryAssetUrl(
  url: string
): CloudinaryAssetDetails | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname !== "res.cloudinary.com") {
      return null;
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = pathParts.indexOf("upload");

    if (uploadIndex < 2) {
      return null;
    }

    const resourceType = pathParts[uploadIndex - 1];

    if (resourceType !== "image" && resourceType !== "video") {
      return null;
    }

    const publicIdParts = pathParts.slice(uploadIndex + 1);

    // Remove the Cloudinary version segment, for example "v123456789".
    if (/^v\d+$/.test(publicIdParts[0] ?? "")) {
      publicIdParts.shift();
    }

    if (publicIdParts.length === 0) {
      return null;
    }

    const filename = publicIdParts.pop();

    if (!filename) {
      return null;
    }

    // Cloudinary expects the public ID without the file extension.
    const filenameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
    publicIdParts.push(filenameWithoutExtension);

    return {
      publicId: decodeURIComponent(publicIdParts.join("/")),
      resourceType,
    };
  } catch {
    return null;
  }
}

export async function deleteCloudinaryAssetByUrl(
  url?: string | null
): Promise<void> {
  if (!url) {
    return;
  }

  const asset = parseCloudinaryAssetUrl(url);

  // External URLs cannot be deleted through this Cloudinary account.
  if (!asset) {
    return;
  }

  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary must be configured before deleting account media."
    );
  }

  const result = await cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(
      `Cloudinary could not delete asset: ${asset.publicId}`
    );
  }
}
