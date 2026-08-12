import { z } from "zod";

export const postJobSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().trim().min(3, "Add a short title").max(120),
  description: z.string().trim().min(10, "Add a few more details").max(1000),
  address: z.string().trim().min(1, "Address is required"),
  date: z.date(),
  peopleNeeded: z.number().int().min(1).max(15),
  budget: z.number().min(1, "Enter a budget"),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
  isEmergency: z.boolean(),
  paymentPreference: z.enum(["cash", "paypal", "both"]),
});
export type PostJobFormValues = z.infer<typeof postJobSchema>;
