import { AppError } from "../../lib/errors.js";
import { emitToUser } from "../../lib/realtime.js";
import type { ClientSession } from "mongoose";
import { authRepository } from "../auth/auth.repository.js";
import { normalizeNotificationPreferences } from "../auth/auth.model.js";
import type { NotificationData, NotificationDocument, NotificationType } from "./notification.model.js";
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

export async function createNotificationRecord(
  input: Omit<CreateNotificationInput, "realtimePayload">,
  session?: ClientSession
) {
  const notification = await notificationRepository.create({
    recipientId: input.recipientId,
    type: input.type,
    data: input.data,
  }, session);

  return notification;
}

export async function emitCommittedNotification(
  notification: NotificationDocument,
  realtimePayload?: unknown
) {
  const recipientId = notification.recipientId.toString();
  const type = notification.type as NotificationType;

  // Persistence is the source of truth. Preferences affect live delivery, never in-app history.
  let preferences;
  try {
    const recipient = await authRepository.findById(recipientId);
    preferences = normalizeNotificationPreferences(recipient?.notificationPrefs);
  } catch {
    // A delivery-preference lookup must not turn a persisted lifecycle action into a failed request.
    return notification;
  }
  if (!isRealtimeDeliveryEnabled(type, preferences)) return notification;

  emitToUser(recipientId, "notification:new", notification);

  const legacyEvent = LEGACY_EVENT_BY_TYPE[type];
  if (legacyEvent) {
    emitToUser(recipientId, legacyEvent, realtimePayload ?? notification.data ?? {});
  }

  return notification;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await createNotificationRecord(input);
  await emitCommittedNotification(notification, input.realtimePayload);
  return notification;
}

function isRealtimeDeliveryEnabled(
  type: NotificationType,
  preferences: ReturnType<typeof normalizeNotificationPreferences>
) {
  switch (type) {
    case "new_application":
      return preferences.newApplicant;
    case "new_message":
      return preferences.newMessage;
    case "offer_received":
      return preferences.offers;
    case "offer_accepted":
    case "offer_declined":
    case "application_rejected":
      return preferences.applicationUpdates;
    case "job_cancelled":
      return preferences.cancellations;
    case "job_completed":
      return preferences.completions;
    case "job_updated":
    case "job_reposted":
      return preferences.jobEdits;
    case "job_expired":
      return preferences.jobStatusChanges;
  }
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
