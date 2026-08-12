import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { jobIdParamsSchema } from "../jobs/job.validation.js";
import { reviewService } from "./review.service.js";
import { createReviewSchema } from "./review.validation.js";

export const reviewController = {
  async create(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const input = createReviewSchema.parse(req.body);
    const review = await reviewService.create(id, req.auth.userId, input);
    res.status(201).json({ review });
  },
};
