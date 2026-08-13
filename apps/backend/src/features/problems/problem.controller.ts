import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { jobIdParamsSchema } from "../jobs/job.validation.js";
import { problemService } from "./problem.service.js";
import { reportProblemSchema } from "./problem.validation.js";

export const problemController = {
  async report(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const input = reportProblemSchema.parse(req.body);
    const report = await problemService.report(id, req.auth.userId, input);
    res.status(201).json({ report });
  },
};
