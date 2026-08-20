import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { isCloudinaryConfigured, uploadBuffer } from "../../lib/cloudinary.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const mediaController = {
  async upload(req: Request, res: Response) {
    if (!isCloudinaryConfigured) {
      throw new AppError(503, "INTERNAL_ERROR", "Media uploads are not configured on this server.");
    }
    if (!req.file) {
      throw AppError.badRequest("Attach a photo or video as `file`.");
    }
    if (req.file.size > MAX_UPLOAD_BYTES) {
      throw AppError.badRequest("File is too large (max 10MB).");
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const isImage = req.file.mimetype.startsWith("image/");
    const isAudio = req.file.mimetype.startsWith("audio/");

    if (!isVideo && !isImage && !isAudio) {
      throw AppError.badRequest("Only image, video, or audio files are supported.");
    }

    const { url } = await uploadBuffer(req.file.buffer, isImage ? "image" : "video");
    res.status(201).json({ url, type: isAudio ? "audio" : isVideo ? "video" : "photo" });
  },
};
