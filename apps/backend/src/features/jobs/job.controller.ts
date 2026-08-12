import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { jobService } from "./job.service.js";
import { createJobSchema, jobIdParamsSchema, listJobsQuerySchema } from "./job.validation.js";

export const jobController = {
  async list(req: Request, res: Response) {
    const query = listJobsQuerySchema.parse(req.query);
    const result = await jobService.list(query);
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response) {
    const { id } = jobIdParamsSchema.parse(req.params);
    const job = await jobService.getById(id);
    res.status(200).json({ job });
  },

  async create(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = createJobSchema.parse(req.body);
    const job = await jobService.create(req.auth.userId, input);
    res.status(201).json({ job });
  },

  async listMinePosted(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const jobs = await jobService.listPostedBy(req.auth.userId);
    res.status(200).json({ jobs });
  },

  async listMineAssigned(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const jobs = await jobService.listAssignedTo(req.auth.userId);
    res.status(200).json({ jobs });
  },

  async complete(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const job = await jobService.complete(id, req.auth.userId);
    res.status(200).json({ job });
  },
};
