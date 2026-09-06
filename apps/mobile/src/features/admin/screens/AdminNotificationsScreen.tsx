import { FlatList, Pressable, RefreshControl } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminNotifications, useReadAdminNotification, useReadAllAdminNotifications } from "../hooks/useAdmin";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

export function AdminNotificationsScreen() {
  const { t, i18n } = useTranslation(); const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>(); const query = useAdminNotifications(); const read = useReadAdminNotification(); const readAll = useReadAllAdminNotifications();
  const open = (item: NonNullable<typeof query.data>["items"][number]) => { if (!item.readAt) read.mutate(item._id); if (item.targetType === "support_ticket") navigation.navigate("AdminTicketDetail", { ticketId: item.targetId }); else if (item.targetType === "job") navigation.navigate("AdminJobDetail", { jobId: item.targetId }); };
  return <Screen padded={false}><AdminHeader title={t("admin.notifications.title")} showBack />{(query.data?.unreadCount ?? 0) > 0 ? <Button margin="$3" size="sm" variant="outline" loading={readAll.isPending} onPress={() => readAll.mutate(undefined)}>{t("admin.notifications.markAll")}</Button> : null}{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : <FlatList data={query.data?.items ?? []} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 16, gap: 10 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListEmptyComponent={<EmptyState title={t("admin.notifications.empty")} />} renderItem={({ item }) => <Pressable onPress={() => open(item)} role="button" aria-label={t(`admin.notifications.${item.type}`)}><Card backgroundColor={item.readAt ? "$backgroundStrong" : "$brand50"}><Text fontWeight={item.readAt ? "400" : "700"}>{t(`admin.notifications.${item.type}`)}</Text><Text variant="caption">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</Text></Card></Pressable>} />}</Screen>;
}
