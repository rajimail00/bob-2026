import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { applicationController } from "../applications/application.controller.js";
import { messageController } from "../messages/message.controller.js";
import { reviewController } from "../reviews/review.controller.js";
import { jobController } from "./job.controller.js";

export const jobRouter = Router();

jobRouter.get("/", asyncHandler(jobController.list));
jobRouter.get("/mine/posted", requireAuth, asyncHandler(jobController.listMinePosted));
jobRouter.get("/mine/assigned", requireAuth, asyncHandler(jobController.listMineAssigned));
jobRouter.get("/:id", asyncHandler(jobController.getById));
jobRouter.post("/", requireAuth, asyncHandler(jobController.create));
jobRouter.post("/:id/complete", requireAuth, asyncHandler(jobController.complete));
jobRouter.delete("/:id", requireAuth, asyncHandler(jobController.remove));
jobRouter.post("/:id/applications", requireAuth, asyncHandler(applicationController.apply));
jobRouter.get("/:id/applications", requireAuth, asyncHandler(applicationController.listForJob));
jobRouter.post("/:id/reviews", requireAuth, asyncHandler(reviewController.create));
jobRouter.get("/:id/conversations", requireAuth, asyncHandler(messageController.listConversationsForJob));
jobRouter.get("/:id/messages/:workerId", requireAuth, asyncHandler(messageController.listForConversation));
jobRouter.post("/:id/messages/:workerId", requireAuth, asyncHandler(messageController.send));
