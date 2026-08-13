import { apiClient } from "@/lib/apiClient";
import type { Conversation, Message } from "../types/message.types";

export const messagesApi = {
  async listForConversation(jobId: string, workerId: string) {
    const { data } = await apiClient.get<{ messages: Message[] }>(`/jobs/${jobId}/messages/${workerId}`);
    return data.messages;
  },

  async send(jobId: string, workerId: string, input: { text?: string; attachmentUrl?: string }) {
    const { data } = await apiClient.post<{ message: Message }>(`/jobs/${jobId}/messages/${workerId}`, input);
    return data.message;
  },

  async listConversationsForJob(jobId: string) {
    const { data } = await apiClient.get<{ conversations: Conversation[] }>(`/jobs/${jobId}/conversations`);
    return data.conversations;
  },
};
