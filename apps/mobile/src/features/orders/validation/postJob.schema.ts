import { z } from "zod";

export const postJobSchema = z.object({
  categoryId: z.string().min(1, "postJob.validation.category"),
  title: z.string().trim().min(3, "postJob.validation.title").max(120, "postJob.validation.title"),
  description: z.string().trim().min(10, "postJob.validation.description").max(1000, "postJob.validation.description"),
  address: z.string().trim().min(1, "postJob.validation.address"),
  date: z.date({ required_error: "postJob.validation.date", invalid_type_error: "postJob.validation.date" }),
  peopleNeeded: z.number().int("postJob.validation.people").min(1, "postJob.validation.people").max(15, "postJob.validation.people"),
  budget: z.number().min(1, "postJob.validation.budget"),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
  isEmergency: z.boolean(),
  paymentPreference: z.enum(["cash", "paypal", "both"]),
});
export type PostJobFormValues = z.infer<typeof postJobSchema>;
