import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";
import type { AppNotification, NotificationListResponse } from "../types/notification.types";

export const NOTIFICATION_PAGE_SIZE = 20;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unreadCount"] as const,
};

type NotificationPages = InfiniteData<NotificationListResponse, number>;

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam, NOTIFICATION_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });
}

export function useUnreadNotificationCount() {
  const query = useNotifications();
  return {
    ...query,
    unreadCount: query.data?.pages[0]?.unreadCount ?? 0,
  };
}

export function addNotificationToCache(
  queryClient: QueryClient,
  notification: AppNotification
) {
  const current = queryClient.getQueryData<NotificationPages>(notificationKeys.list);
  if (!current?.pages.length) return false;

  if (current.pages.some((page) => page.items.some((item) => item._id === notification._id))) {
    return true;
  }

  queryClient.setQueryData<NotificationPages>(notificationKeys.list, {
    ...current,
    pages: current.pages.map((page, index) => ({
      ...page,
      total: page.total + 1,
      unreadCount: page.unreadCount + (notification.readAt ? 0 : 1),
      items: index === 0 ? [notification, ...page.items] : page.items,
    })),
  });
  queryClient.setQueryData<number>(notificationKeys.unreadCount, (count = 0) =>
    count + (notification.readAt ? 0 : 1)
  );
  return true;
}

function updateNotificationPages(
  current: NotificationPages | undefined,
  update: (notification: AppNotification) => AppNotification,
  unreadCount: (currentCount: number) => number
) {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      unreadCount: unreadCount(page.unreadCount),
      items: page.items.map(update),
    })),
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (notification) => {
      const current = queryClient.getQueryData<NotificationPages>(notificationKeys.list);
      const wasUnread = current?.pages.some((page) =>
        page.items.some((item) => item._id === notification._id && !item.readAt)
      );
      queryClient.setQueryData<NotificationPages>(notificationKeys.list, (current) => {
        return updateNotificationPages(
          current,
          (item) => (item._id === notification._id ? notification : item),
          (count) => Math.max(0, count - (wasUnread ? 1 : 0))
        );
      });
      queryClient.setQueryData<number>(notificationKeys.unreadCount, (count = 0) =>
        Math.max(0, count - (wasUnread ? 1 : 0))
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationPages>(notificationKeys.list, (current) =>
        updateNotificationPages(
          current,
          (item) => (item.readAt ? item : { ...item, readAt }),
          () => 0
        )
      );
      queryClient.setQueryData(notificationKeys.unreadCount, 0);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
