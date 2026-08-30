import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { notificationService } from "./notification.service.js";
import { listNotificationsQuerySchema, notificationIdParamsSchema } from "./notification.validation.js";

export const notificationController = {
  async list(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { page, pageSize } = listNotificationsQuerySchema.parse(req.query);
    const result = await notificationService.list(req.auth.userId, page, pageSize);
    res.status(200).json(result);
  },

  async markRead(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = notificationIdParamsSchema.parse(req.params);
    const notification = await notificationService.markRead(id, req.auth.userId);
    res.status(200).json({ notification });
  },

  async markAllRead(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await notificationService.markAllRead(req.auth.userId);
    res.status(200).json(result);
  },
};
