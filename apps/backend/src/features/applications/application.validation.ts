import { z } from "zod";

export const createApplicationSchema = z.object({
  message: z.string().trim().min(1, "Add a short message").max(1000),
  voiceNoteUrl: z.string().url().optional(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const selectApplicationParamsSchema = z.object({
  id: z.string().min(1),
});
