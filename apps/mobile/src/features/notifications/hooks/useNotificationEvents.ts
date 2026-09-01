import { useEffect } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { addNotificationToCache, notificationKeys } from "./useNotifications";
import type { AppNotification } from "../types/notification.types";
import type { JobListResponse } from "@/features/home/types/job.types";

function invalidateJobDetail(queryClient: QueryClient, jobId?: string) {
  if (jobId) queryClient.invalidateQueries({ queryKey: ["jobs", "detail", jobId] });
}

function removeJobFromGlobalListCache(queryClient: QueryClient, jobId?: string) {
  if (!jobId) return;
  queryClient.setQueriesData<JobListResponse>({ queryKey: ["jobs", "list"] }, (current) => {
    if (!current) return current;
    const items = current.items.filter((job) => job._id !== jobId);
    return items.length === current.items.length
      ? current
      : { ...current, items, total: Math.max(0, current.total - 1) };
  });
}

export function invalidateForNotification(queryClient: QueryClient, notification: AppNotification) {
  const { jobId } = notification.data;

  switch (notification.type) {
    case "new_application":
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ["applications", "forJob", jobId] });
        queryClient.invalidateQueries({ queryKey: ["conversations", "forJob", jobId] });
      }
      break;
    case "offer_received":
      removeJobFromGlobalListCache(queryClient, jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine"] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "offer_accepted":
      removeJobFromGlobalListCache(queryClient, jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "assigned"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      if (jobId) queryClient.invalidateQueries({ queryKey: ["applications", "forJob", jobId] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "offer_declined":
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      if (jobId) queryClient.invalidateQueries({ queryKey: ["applications", "forJob", jobId] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "application_rejected":
      removeJobFromGlobalListCache(queryClient, jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine"] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "job_cancelled":
    case "job_completed":
    case "job_expired":
      removeJobFromGlobalListCache(queryClient, jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "assigned"] });
      if (jobId) queryClient.invalidateQueries({ queryKey: ["applications", "forJob", jobId] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "job_updated":
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "assigned"] });
      invalidateJobDetail(queryClient, jobId);
      break;
    case "new_message":
      if (jobId) queryClient.invalidateQueries({ queryKey: ["conversations", "forJob", jobId] });
      if (jobId && notification.data.workerId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", jobId, notification.data.workerId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      }
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      break;
    case "job_reposted":
      queryClient.invalidateQueries({ queryKey: ["jobs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      break;
  }
}

export function useNotificationEvents() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = Boolean(accessToken && userId);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    const handleNotification = (notification: AppNotification) => {
      const updated = addNotificationToCache(queryClient, notification);
      if (!updated) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      }
      invalidateForNotification(queryClient, notification);
    };

    socket.on("notification:new", handleNotification);
    return () => {
      socket.off("notification:new", handleNotification);
      disconnectSocket();
    };
  }, [isAuthenticated, queryClient, userId]);
}
