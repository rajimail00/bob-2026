import { z } from "zod";
import { PROBLEM_REASONS } from "./problem.model.js";

export const reportProblemSchema = z.object({
  reason: z.enum(PROBLEM_REASONS),
  note: z.string().trim().max(1000).optional(),
});
export type ReportProblemInput = z.infer<typeof reportProblemSchema>;
