import { z } from "zod";
import { PAYMENT_PREFERENCES, RECURRENCE_OPTIONS } from "./job.model.js";

export const createJobSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10, "Add a few more details").max(1000),
  media: z.array(z.object({ url: z.string().url(), type: z.enum(["photo", "video"]) })).default([]),
  location: z.object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  }),
  address: z.string().trim().min(1, "Address is required"),
  date: z.coerce.date(),
  peopleNeeded: z.number().int().min(1).max(20).default(1),
  budget: z.number().min(0),
  recurrence: z.enum(RECURRENCE_OPTIONS).default("none"),
  isEmergency: z.boolean().default(false),
  paymentPreference: z.enum(PAYMENT_PREFERENCES).default("cash"),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const listJobsQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  radiusKm: z.coerce.number().min(1).max(200).default(18),
  categoryId: z.string().optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  peopleNeeded: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

export const jobIdParamsSchema = z.object({ id: z.string().min(1) });
