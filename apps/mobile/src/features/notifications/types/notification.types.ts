export const NOTIFICATION_TYPES = [
  "new_application",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "application_rejected",
  "job_cancelled",
  "job_completed",
  "new_message",
  "job_updated",
  "job_expired",
  "job_reposted",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationData {
  jobId?: string;
  originalJobId?: string;
  applicationId?: string;
  workerId?: string;
  messageId?: string;
}

export interface AppNotification {
  _id: string;
  recipientId: string;
  type: NotificationType;
  data: NotificationData;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export type NotificationDestination =
  | { screen: "ApplicantProfile"; params: { jobId: string; applicationId: string } }
  | { screen: "Chat"; params: { jobId: string; workerId: string } }
  | { screen: "JobDetail"; params: { jobId: string } };

export function getNotificationDestination(
  notification: AppNotification
): NotificationDestination | null {
  const { jobId, applicationId, workerId } = notification.data;
  if (notification.type === "new_application" && jobId && applicationId) {
    return { screen: "ApplicantProfile", params: { jobId, applicationId } };
  }
  if (notification.type === "new_message" && jobId && workerId) {
    return { screen: "Chat", params: { jobId, workerId } };
  }
  if (jobId) return { screen: "JobDetail", params: { jobId } };
  return null;
}
