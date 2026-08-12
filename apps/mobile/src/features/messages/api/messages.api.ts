import { apiClient } from "@/lib/apiClient";
import type { Message } from "../types/message.types";

export const messagesApi = {
  async listForJob(jobId: string) {
    const { data } = await apiClient.get<{ messages: Message[] }>(`/jobs/${jobId}/messages`);
    return data.messages;
  },

  async send(jobId: string, input: { text?: string; attachmentUrl?: string }) {
    const { data } = await apiClient.post<{ message: Message }>(`/jobs/${jobId}/messages`, input);
    return data.message;
  },
};
