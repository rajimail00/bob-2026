import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { jobIdParamsSchema } from "../jobs/job.validation.js";
import { broadcastToJob } from "../../lib/socket.js";
import { messageService } from "./message.service.js";
import { createMessageSchema } from "./message.validation.js";

export const messageController = {
  async send(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const input = createMessageSchema.parse(req.body);
    const message = await messageService.send(id, req.auth.userId, input);

    broadcastToJob(id, "message:new", message);

    res.status(201).json({ message });
  },

  async listForJob(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const messages = await messageService.listForJob(id, req.auth.userId);
    res.status(200).json({ messages });
  },
};
