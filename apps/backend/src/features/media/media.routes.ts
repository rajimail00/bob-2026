import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { mediaController } from "./media.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const mediaRouter = Router();

mediaRouter.post("/", requireAuth, upload.single("file"), asyncHandler(mediaController.upload));
