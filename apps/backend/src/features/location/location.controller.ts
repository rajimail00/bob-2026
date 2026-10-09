import type { Request, Response } from "express";
import { searchPlace } from "./location.service.js";
import { placeSearchSchema } from "./location.validation.js";

export const locationController = {
  async search(req: Request, res: Response) {
    const input = placeSearchSchema.parse(req.body);
    res.json({ place: await searchPlace(input) });
  },
};
