import { AppError } from "../../lib/errors.js";
import { emitToUser } from "../../lib/realtime.js";
import type { NotificationData, NotificationType } from "./notification.model.js";
import { notificationRepository } from "./notification.repository.js";

const LEGACY_EVENT_BY_TYPE: Partial<Record<NotificationType, string>> = {
  new_application: "application:new",
  offer_received: "application:offered",
  offer_accepted: "application:accepted",
  offer_declined: "application:declined",
  application_rejected: "application:rejected",
  job_cancelled: "job:cancelled",
  job_completed: "job:completed",
  new_message: "message:notify",
  job_updated: "job:updated",
  job_expired: "job:expired",
  job_reposted: "job:reposted",
};

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  data?: NotificationData;
  /** Optional full payload for the pre-existing lifecycle Socket.IO event. */
  realtimePayload?: unknown;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await notificationRepository.create({
    recipientId: input.recipientId,
    type: input.type,
    data: input.data,
  });

  // Persistence is the source of truth. Realtime delivery happens only after the insert succeeds.
  emitToUser(input.recipientId, "notification:new", notification);

  const legacyEvent = LEGACY_EVENT_BY_TYPE[input.type];
  if (legacyEvent) {
    emitToUser(input.recipientId, legacyEvent, input.realtimePayload ?? input.data ?? {});
  }

  return notification;
}

export const notificationService = {
  createNotification,

  list(recipientId: string, page: number, pageSize: number) {
    return notificationRepository.listForRecipient(recipientId, page, pageSize);
  },

  async markRead(id: string, recipientId: string) {
    const notification = await notificationRepository.markRead(id, recipientId);
    if (!notification) throw AppError.notFound("Notification not found.");
    return notification;
  },

  async markAllRead(recipientId: string) {
    const result = await notificationRepository.markAllRead(recipientId);
    return { modifiedCount: result.modifiedCount };
  },
};
