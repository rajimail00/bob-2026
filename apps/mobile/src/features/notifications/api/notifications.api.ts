import { apiClient } from "@/lib/apiClient";
import type { AppNotification, NotificationListResponse } from "../types/notification.types";

export const notificationsApi = {
  async list(page = 1, pageSize = 20) {
    const { data } = await apiClient.get<NotificationListResponse>("/notifications", {
      params: { page, pageSize },
    });
    return data;
  },

  async markRead(id: string) {
    const { data } = await apiClient.patch<{ notification: AppNotification }>(
      `/notifications/${id}/read`
    );
    return data.notification;
  },

  async markAllRead() {
    const { data } = await apiClient.patch<{ modifiedCount: number }>(
      "/notifications/read-all"
    );
    return data;
  },
};
