import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { applicationController } from "./application.controller.js";

export const applicationRouter = Router();

applicationRouter.get("/mine", requireAuth, asyncHandler(applicationController.listMine));
applicationRouter.patch("/:id/select", requireAuth, asyncHandler(applicationController.select));
