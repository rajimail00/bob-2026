import { z } from "zod";

export const conversationParamsSchema = z.object({
  id: z.string().min(1),
  workerId: z.string().min(1),
});

export const createMessageSchema = z
  .object({
    text: z.string().trim().max(2000).optional(),
    attachmentUrl: z.string().url().optional(),
  })
  .refine((data) => Boolean(data.text) || Boolean(data.attachmentUrl), {
    message: "Message must have text or an attachment",
  });
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
