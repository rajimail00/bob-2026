import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const ADMIN_NOTIFICATION_TYPES = [
  "new_support_ticket",
  "urgent_ticket",
  "reported_job",
  "pending_job_moderation",
  "unusual_action",
] as const;

const adminNotificationSchema = new Schema(
  {
    recipientAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ADMIN_NOTIFICATION_TYPES, required: true },
    targetType: { type: String, required: true, maxlength: 50 },
    targetId: { type: String, required: true, maxlength: 100 },
    readAt: { type: Date },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ recipientAdminId: 1, createdAt: -1 });
adminNotificationSchema.index(
  { recipientAdminId: 1, type: 1, targetId: 1 },
  { unique: true }
);
export type AdminNotificationDocument = HydratedDocument<InferSchemaType<typeof adminNotificationSchema>>;
export const AdminNotificationModel = model("AdminNotification", adminNotificationSchema);
