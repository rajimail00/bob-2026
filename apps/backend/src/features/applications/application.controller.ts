import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { applicationService } from "./application.service.js";
import {
  applicationIdParamsSchema,
  createApplicationSchema,
  respondToOfferSchema,
} from "./application.validation.js";
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

  async offer(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = applicationIdParamsSchema.parse(req.params);
    const application = await applicationService.offer(id, req.auth.userId);
    res.status(200).json({ application });
  },

  async respond(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = applicationIdParamsSchema.parse(req.params);
    const { accept } = respondToOfferSchema.parse(req.body);
    const application = await applicationService.respond(id, req.auth.userId, accept);
    res.status(200).json({ application });
  },
};
