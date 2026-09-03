import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

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

const notificationDataSchema = new Schema(
  {
    jobId: { type: String },
    originalJobId: { type: String },
    applicationId: { type: String },
    workerId: { type: String },
    messageId: { type: String },
  },
  { _id: false }
);
const notificationSchema = new Schema(

  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    data: { type: notificationDataSchema, default: () => ({}) },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export type NotificationDocument = HydratedDocument<InferSchemaType<typeof notificationSchema>>;
export const NotificationModel = model("Notification", notificationSchema);
