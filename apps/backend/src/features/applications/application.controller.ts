import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { applicationService } from "./application.service.js";
import { createApplicationSchema, selectApplicationParamsSchema } from "./application.validation.js";
import { jobIdParamsSchema } from "../jobs/job.validation.js";

export const applicationController = {
  async apply(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const input = createApplicationSchema.parse(req.body);
    const application = await applicationService.apply(id, req.auth.userId, input);
    res.status(201).json({ application });
  },

  async listForJob(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const applications = await applicationService.listForJob(id, req.auth.userId);
    res.status(200).json({ applications });
  },

  async listMine(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const applications = await applicationService.listMine(req.auth.userId);
    res.status(200).json({ applications });
  },

  async select(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = selectApplicationParamsSchema.parse(req.params);
    const application = await applicationService.select(id, req.auth.userId);
    res.status(200).json({ application });
  },
};
