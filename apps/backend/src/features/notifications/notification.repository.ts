import type { ClientSession } from "mongoose";
import { NotificationModel, type NotificationData, type NotificationDocument, type NotificationType } from "./notification.model.js";

export const notificationRepository = {
  async create(
    data: { recipientId: string; type: NotificationType; data?: NotificationData },
    session?: ClientSession
  ): Promise<NotificationDocument> {
    if (!session) return NotificationModel.create(data);
    const [notification] = await NotificationModel.create([data], { session });
    if (!notification) throw new Error("Notification insert returned no document.");
    return notification;
  },

  async listForRecipient(recipientId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total, unreadCount] = await Promise.all([
      NotificationModel.find({ recipientId }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize),
      NotificationModel.countDocuments({ recipientId }),
      NotificationModel.countDocuments({ recipientId, readAt: null }),
    ]);

    return { items, total, page, pageSize, unreadCount };
  },

  markRead(id: string, recipientId: string) {
    const now = new Date();
    return NotificationModel.findOneAndUpdate(
      { _id: id, recipientId },
      [{ $set: { readAt: { $ifNull: ["$readAt", now] } } }],
      { new: true }
    );
  },

  markAllRead(recipientId: string) {
    return NotificationModel.updateMany(
      { recipientId, readAt: null },
      { $set: { readAt: new Date() } }
    );
  },
};
