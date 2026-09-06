import { UserModel } from "../auth/auth.model.js";
import { AdminNotificationModel, type ADMIN_NOTIFICATION_TYPES } from "./adminNotification.model.js";

export async function notifyActiveAdmins(
  type: (typeof ADMIN_NOTIFICATION_TYPES)[number],
  targetType: string,
  targetId: string
) {
  const admins = await UserModel.find({ role: "admin", status: "active" }).select("_id").lean();
  if (admins.length === 0) return;
  await AdminNotificationModel.bulkWrite(
    admins.map((admin) => ({
      updateOne: {
        filter: { recipientAdminId: admin._id, type, targetId },
        update: { $setOnInsert: { recipientAdminId: admin._id, type, targetType, targetId } },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}
