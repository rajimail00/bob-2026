import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { notificationController } from "./notification.controller.js";

export const notificationRouter = Router();

notificationRouter.get("/", requireAuth, asyncHandler(notificationController.list));
notificationRouter.patch("/read-all", requireAuth, asyncHandler(notificationController.markAllRead));
notificationRouter.patch("/:id/read", requireAuth, asyncHandler(notificationController.markRead));
