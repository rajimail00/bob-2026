import { z } from "zod";
import {
  ADVERTISEMENT_AUDIENCES,
  ADVERTISEMENT_EFFECTIVE_STATUSES,
  ADVERTISEMENT_PLACEMENTS,
} from "./advertisement.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const httpsUrl = z.string().trim().max(2048).url().refine((value) => new URL(value).protocol === "https:", "Use a secure HTTPS URL");
const mediaSchema = z
  .object({
    type: z.enum(["image", "video"]),
    url: httpsUrl,
    publicId: z.string().trim().min(1).max(300).optional(),
    mimeType: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((media, context) => {
    if (media.mimeType && !media.mimeType.startsWith(`${media.type}/`)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["mimeType"], message: "Media type and MIME type do not match" });
    }
  });

const commonFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  destinationUrl: httpsUrl.optional(),
  placement: z.enum(ADVERTISEMENT_PLACEMENTS),
  audience: z.enum(ADVERTISEMENT_AUDIENCES),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  priority: z.coerce.number().int().min(0).max(100),
};

export const createAdvertisementSchema = z
  .object({
    ...commonFields,
    // Kept only as a backwards-compatible internal identifier. The mobile admin
    // form is media-first and no longer asks administrators for display copy.
    title: commonFields.title.optional().default("Advertisement"),
    media: mediaSchema.optional(),
    status: z.enum(["draft", "active"]).default("draft"),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.endsAt <= input.startsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End time must be after start time" });
    }
    if (input.status === "active" && !input.media) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["media"], message: "Media is required before publishing" });
    }
    if (input.status === "active" && input.endsAt <= new Date()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "An active advertisement must end in the future" });
    }
  });

export const updateAdvertisementSchema = z
  .object({
    title: commonFields.title.optional(),
    description: commonFields.description,
    destinationUrl: httpsUrl.nullable().optional(),
    placement: z.enum(ADVERTISEMENT_PLACEMENTS).optional(),
    audience: z.enum(ADVERTISEMENT_AUDIENCES).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    priority: commonFields.priority.optional(),
    media: mediaSchema.nullable().optional(),
    status: z.enum(["draft", "active"]).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "Provide an advertisement update")
  .superRefine((input, context) => {
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End time must be after start time" });
    }
  });

export const advertisementIdParamsSchema = z.object({ id: objectId }).strict();
export const advertisementListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(120).optional(),
    status: z.enum(ADVERTISEMENT_EFFECTIVE_STATUSES).optional(),
  })
  .strict();
export const activeAdvertisementQuerySchema = z
  .object({ placement: z.enum(ADVERTISEMENT_PLACEMENTS).default("home_list") })
  .strict();

export type CreateAdvertisementInput = z.infer<typeof createAdvertisementSchema>;
export type UpdateAdvertisementInput = z.infer<typeof updateAdvertisementSchema>;
export type AdvertisementListQuery = z.infer<typeof advertisementListQuerySchema>;
