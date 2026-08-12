import { MessageModel } from "./message.model.js";

export const messageRepository = {
  create(data: { jobId: string; senderId: string; text?: string; attachmentUrl?: string }) {
    return MessageModel.create(data);
  },

  listForJob(jobId: string) {
    return MessageModel.find({ jobId }).sort({ createdAt: 1 }).populate("senderId", "firstName lastName photoUrl");
  },
};
