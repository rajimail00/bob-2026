import { z } from "zod";
import { PAYMENT_PREFERENCES, RECURRENCE_OPTIONS } from "./job.model.js";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 2;

const categoryIdSchema = z.string().min(1, "Choose a category");
const titleSchema = z.string().trim().min(3).max(120);
const descriptionSchema = z.string().trim().min(10, "Add a few more details").max(1000);
const mediaSchema = z
  .array(z.object({ url: z.string().url(), type: z.enum(["photo", "video"]) }).strict())
    .refine((items) => items.filter((m) => m.type === "photo").length <= MAX_PHOTOS, {
      message: `Up to ${MAX_PHOTOS} photos allowed`,
    })
    .refine((items) => items.filter((m) => m.type === "video").length <= MAX_VIDEOS, {
      message: `Up to ${MAX_VIDEOS} videos allowed`,
    });
const locationSchema = z
  .object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  })
  .strict();
const addressSchema = z.string().trim().min(1, "Address is required");
// Date.now() is evaluated when each request is parsed, not when this module is imported.
const futureDateSchema = z.coerce.date().refine((date) => date.getTime() > Date.now(), {
    message: "Choose a date and time in the future",
  });
const peopleNeededSchema = z.number().int().min(1).max(15);
const budgetSchema = z.number().min(0);
const recurrenceSchema = z.enum(RECURRENCE_OPTIONS);
const emergencySchema = z.boolean();
const paymentPreferenceSchema = z.enum(PAYMENT_PREFERENCES);

export const createJobSchema = z
  .object({
    categoryId: categoryIdSchema,
    title: titleSchema,
    description: descriptionSchema,
    media: mediaSchema.default([]),
    location: locationSchema,
    address: addressSchema,
    date: futureDateSchema,
    peopleNeeded: peopleNeededSchema.default(1),
    budget: budgetSchema,
    recurrence: recurrenceSchema.default("none"),
    isEmergency: emergencySchema.default(false),
    paymentPreference: paymentPreferenceSchema.default("cash"),
  });
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z
  .object({
    categoryId: categoryIdSchema.optional(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    media: mediaSchema.optional(),
    location: locationSchema.optional(),
    address: addressSchema.optional(),
    date: futureDateSchema.optional(),
    peopleNeeded: peopleNeededSchema.optional(),
    budget: budgetSchema.optional(),
    recurrence: recurrenceSchema.optional(),
    isEmergency: emergencySchema.optional(),
    paymentPreference: paymentPreferenceSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const listJobsQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  radiusKm: z.coerce.number().min(1).max(200).default(18),
  /** Comma-separated category ids for multi-select filtering, e.g. "id1,id2". A single id works too. */
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
