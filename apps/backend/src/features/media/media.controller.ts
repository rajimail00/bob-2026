import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { deleteCloudinaryAsset, isCloudinaryConfigured, uploadBuffer } from "../../lib/cloudinary.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 15;

export const mediaController = {
  async upload(req: Request, res: Response) {
    if (!isCloudinaryConfigured) {
      throw new AppError(503, "INTERNAL_ERROR", "Media uploads are not configured on this server.");
    }
    if (!req.file) {
      throw AppError.badRequest("Attach a photo or video as `file`.");
    }
    if (req.file.size > MAX_UPLOAD_BYTES) {
      throw AppError.badRequest("File is too large (max 10MB).", undefined, "MEDIA_TOO_LARGE");
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const isImage = req.file.mimetype.startsWith("image/");
    const isAudio = req.file.mimetype.startsWith("audio/");

    if (!isVideo && !isImage && !isAudio) {
      throw AppError.badRequest("Only image, video, or audio files are supported.", undefined, "MEDIA_UNSUPPORTED");
    }

    const uploaded = await uploadBuffer(req.file.buffer, isImage ? "image" : "video");
    if (isVideo && uploaded.duration && uploaded.duration > MAX_VIDEO_DURATION_SECONDS) {
      // Multer protects memory with the 10 MB cap. Cloudinary gives us the final
      // duration, so remove a direct/bypassed upload that exceeds the job-video rule.
      await deleteCloudinaryAsset(uploaded.publicId, "video").catch(() => undefined);
      throw AppError.badRequest("Video is too long (max 15 seconds).", undefined, "VIDEO_TOO_LONG");
    }
    res.status(201).json({ url: uploaded.url, type: isAudio ? "audio" : isVideo ? "video" : "photo" });
  },
};
