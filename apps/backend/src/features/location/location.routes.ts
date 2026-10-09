import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { locationController } from "./location.controller.js";

export const locationRouter = Router();

locationRouter.post("/search", requireAuth, asyncHandler(locationController.search));
