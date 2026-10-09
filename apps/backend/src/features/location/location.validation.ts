import { z } from "zod";

export const placeSearchSchema = z.object({
  query: z.string().trim().min(2).max(250),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  languageCode: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
}).strict();
