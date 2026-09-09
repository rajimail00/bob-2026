import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { advertisementController as controller } from "./advertisement.controller.js";

export const advertisementRouter = Router();
advertisementRouter.get("/active", requireAuth, asyncHandler(controller.active));

export const adminAdvertisementRouter = Router();
adminAdvertisementRouter.post("/", asyncHandler(controller.create));
adminAdvertisementRouter.get("/", asyncHandler(controller.list));
adminAdvertisementRouter.get("/:id", asyncHandler(controller.get));
adminAdvertisementRouter.patch("/:id", asyncHandler(controller.update));
adminAdvertisementRouter.delete("/:id", asyncHandler(controller.remove));
adminAdvertisementRouter.post("/:id/publish", asyncHandler(controller.publish));
adminAdvertisementRouter.post("/:id/pause", asyncHandler(controller.pause));
adminAdvertisementRouter.post("/:id/archive", asyncHandler(controller.archive));
