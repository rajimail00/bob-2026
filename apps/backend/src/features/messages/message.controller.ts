import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { jobIdParamsSchema } from "../jobs/job.validation.js";
import { broadcastToConversation, notifyOtherParticipant } from "../../lib/socket.js";
import { messageService } from "./message.service.js";
import { conversationParamsSchema, createMessageSchema } from "./message.validation.js";

export const messageController = {
  async send(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id, workerId } = conversationParamsSchema.parse(req.params);
    const input = createMessageSchema.parse(req.body);
    const message = await messageService.send(id, workerId, req.auth.userId, input);

    broadcastToConversation(id, workerId, "message:new", message);
    void notifyOtherParticipant(id, workerId, req.auth.userId, message);

    res.status(201).json({ message });
  },

  async listForConversation(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id, workerId } = conversationParamsSchema.parse(req.params);
    const messages = await messageService.listForConversation(id, workerId, req.auth.userId);
    res.status(200).json({ messages });
  },

  async listConversationsForJob(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = jobIdParamsSchema.parse(req.params);
    const conversations = await messageService.listConversationsForJob(id, req.auth.userId);
    res.status(200).json({ conversations });
  },
};
