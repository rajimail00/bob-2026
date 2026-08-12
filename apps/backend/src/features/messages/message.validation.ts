import { z } from "zod";

export const createMessageSchema = z
  .object({
    text: z.string().trim().max(2000).optional(),
    attachmentUrl: z.string().url().optional(),
  })
  .refine((data) => Boolean(data.text) || Boolean(data.attachmentUrl), {
    message: "Message must have text or an attachment",
  });
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
