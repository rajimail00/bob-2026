import { AppError } from "../../lib/errors.js";
import { jobRepository } from "../jobs/job.repository.js";
import { reviewRepository } from "./review.repository.js";
import type { CreateReviewInput } from "./review.validation.js";

export const reviewService = {
  async create(jobId: string, fromUserId: string, input: CreateReviewInput) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "completed") throw AppError.conflict("You can only review a completed job.");

    const clientId = job.clientId.toString();
    const workerId = job.assignedWorkerId?.toString();
    if (fromUserId !== clientId && fromUserId !== workerId) {
      throw AppError.forbidden("You weren't part of this job.");
    }

    const toUserId = fromUserId === clientId ? workerId : clientId;
    if (!toUserId) throw AppError.conflict("This job has no counterpart to review.");

    const existing = await reviewRepository.findByJobAndAuthor(jobId, fromUserId);
    if (existing) throw AppError.conflict("You've already reviewed this job.");

    const review = await reviewRepository.create({
      jobId,
      fromUserId,
      toUserId,
      stars: input.stars,
      comment: input.comment,
    });

    await reviewRepository.applyToUserRating(toUserId, input.stars);

    return review;
  },
};
