import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { CategoryModel } from "./category.model.js";

export const categoryRouter = Router();

categoryRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await CategoryModel.find().sort({ order: 1 });
    res.status(200).json({ categories });
  })
);
