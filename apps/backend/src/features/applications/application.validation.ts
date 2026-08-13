import { z } from "zod";

export const createApplicationSchema = z.object({
  message: z.string().trim().min(1, "Add a short message").max(1000),
  voiceNoteUrl: z.string().url().optional(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const applicationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const respondToOfferSchema = z.object({
  accept: z.boolean(),
});
export type RespondToOfferInput = z.infer<typeof respondToOfferSchema>;
