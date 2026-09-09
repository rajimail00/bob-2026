import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { advertisementService } from "./advertisement.service.js";
import {
  activeAdvertisementQuerySchema,
  advertisementIdParamsSchema,
  advertisementListQuerySchema,
  createAdvertisementSchema,
  updateAdvertisementSchema,
} from "./advertisement.validation.js";

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export const advertisementController = {
  async create(req: Request, res: Response) {
    const advertisement = await advertisementService.create(auth(req).userId, createAdvertisementSchema.parse(req.body));
    res.status(201).json({ advertisement });
  },
  async list(req: Request, res: Response) {
    res.json(await advertisementService.list(advertisementListQuerySchema.parse(req.query)));
  },
  async get(req: Request, res: Response) {
    res.json({ advertisement: await advertisementService.get(advertisementIdParamsSchema.parse(req.params).id) });
  },
  async update(req: Request, res: Response) {
    const id = advertisementIdParamsSchema.parse(req.params).id;
    res.json({ advertisement: await advertisementService.update(auth(req).userId, id, updateAdvertisementSchema.parse(req.body)) });
  },
  async remove(req: Request, res: Response) {
    await advertisementService.remove(auth(req).userId, advertisementIdParamsSchema.parse(req.params).id);
    res.status(204).send();
  },
  async publish(req: Request, res: Response) {
    res.json({ advertisement: await advertisementService.changeStatus(auth(req).userId, advertisementIdParamsSchema.parse(req.params).id, "publish") });
  },
  async pause(req: Request, res: Response) {
    res.json({ advertisement: await advertisementService.changeStatus(auth(req).userId, advertisementIdParamsSchema.parse(req.params).id, "pause") });
  },
  async archive(req: Request, res: Response) {
    res.json({ advertisement: await advertisementService.changeStatus(auth(req).userId, advertisementIdParamsSchema.parse(req.params).id, "archive") });
  },
  async active(req: Request, res: Response) {
    const { placement } = activeAdvertisementQuerySchema.parse(req.query);
    res.json({ advertisements: await advertisementService.listActive(auth(req).userId, placement) });
  },
};
