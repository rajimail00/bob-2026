import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { HomeStackParamList } from "@/navigation/types";
import { NotificationRow } from "../components/NotificationRow";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications";
import {
  getNotificationDestination,
  type AppNotification,
} from "../types/notification.types";

type Props = NativeStackScreenProps<HomeStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = Array.from(
    new Map(
      (notificationsQuery.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item._id, item])
    ).values()
  );
  const unreadCount = notificationsQuery.data?.pages[0]?.unreadCount ?? 0;

  const navigateForNotification = (notification: AppNotification) => {
    const destination = getNotificationDestination(notification);
    if (destination?.screen === "ApplicantProfile") {
      navigation.navigate(destination.screen, destination.params);
    } else if (destination?.screen === "Chat") {
      navigation.navigate(destination.screen, destination.params);
    } else if (destination) navigation.navigate(destination.screen, destination.params);
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      try {
        await markRead.mutateAsync(notification._id);
      } catch {
        // Navigation remains useful if marking read temporarily fails.
      }
    }
    navigateForNotification(notification);
  };

  const formatCreatedTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (elapsedMinutes < 1) return t("notifications.time.now");
    if (elapsedMinutes < 60) return t("notifications.time.minutes", { count: elapsedMinutes });
    if (elapsedMinutes < 1_440) return t("notifications.time.hours", { count: Math.floor(elapsedMinutes / 60) });
    if (elapsedMinutes < 10_080) return t("notifications.time.days", { count: Math.floor(elapsedMinutes / 1_440) });
    return date.toLocaleString(i18n.language);
  };

  return (
    <Screen padded={false}>
      <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" gap="$3">
        <XStack
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          onPress={() => navigation.goBack()}
          role="button"
          aria-label={t("common.back")}
        >
          <Ionicons name="chevron-back" size={24} color="#4F8266" />
        </XStack>
        <Text variant="h3" flex={1}>{t("notifications.title")}</Text>
        <Button
          variant="ghost"
          size="sm"
          disabled={unreadCount === 0}
          loading={markAllRead.isPending}
          onPress={() => markAllRead.mutate()}
          role="button"
          aria-label={t("notifications.markAllRead")}
        >
          {t("notifications.markAllRead")}
        </Button>
      </XStack>

      {notificationsQuery.isLoading ? (
        <LoadingState label={t("notifications.loading")} />
      ) : notificationsQuery.isError ? (
        <ErrorState
          title={t("notifications.errorTitle")}
          message={getApiErrorMessage(notificationsQuery.error, t("notifications.errorBody"))}
          retryLabel={t("common.retry")}
          onRetry={() => notificationsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              title={t(`notifications.types.${item.type}`)}
              time={formatCreatedTime(item.createdAt)}
              openLabel={t("notifications.open", { message: t(`notifications.types.${item.type}`) })}
              onPress={() => openNotification(item)}
            />
          )}
          refreshing={notificationsQuery.isRefetching && !notificationsQuery.isFetchingNextPage}
          onRefresh={() => notificationsQuery.refetch()}
          onEndReached={() => {
            if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
              notificationsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState title={t("notifications.emptyTitle")} body={t("notifications.emptyBody")} />
          }
          ListFooterComponent={
            notificationsQuery.isFetchingNextPage ? (
              <YStack padding="$4"><LoadingState /></YStack>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
