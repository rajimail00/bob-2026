import { useDeferredValue, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminFilters } from "../components/AdminFilters";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminUsers, useBulkAdminUserStatus, useSetAdminUserStatus } from "../hooks/useAdmin";
import type { AccountStatus, AdminUser, UserQuery } from "../types/admin.types";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

const statuses: AccountStatus[] = ["active", "banned", "deleted"];
const types = ["admin", "worker", "client"] as const;
const sorts: NonNullable<UserQuery["sort"]>[] = ["newest", "oldest", "name_asc", "name_desc", "recent_activity"];

export function AdminUsersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus>();
  const [type, setType] = useState<typeof types[number]>();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NonNullable<UserQuery["sort"]>>("newest");
  const [pageSelected, setPageSelected] = useState(false);
  const query = useAdminUsers({ page, pageSize: 20, search: useDeferredValue(search) || undefined, status, type, sort });
  const statusMutation = useSetAdminUserStatus();
  const bulkMutation = useBulkAdminUserStatus();
  const bulkStatus = (nextStatus: "active" | "banned") => {
    const userIds = (query.data?.items ?? []).map((item) => item._id);
    Alert.alert(t("admin.bulk.confirmTitle"), t("admin.bulk.confirmBody", { count: userIds.length }), [{ text: t("common.cancel"), style: "cancel" }, { text: t(`admin.users.${nextStatus}`), style: nextStatus === "banned" ? "destructive" : "default", onPress: () => bulkMutation.mutate({ userIds, status: nextStatus }, { onSuccess: () => setPageSelected(false) }) }]);
  };
  const act = (user: AdminUser) => {
    if (user.status === "deleted") return;
    const next = user.status === "active" ? "banned" : "active";
    Alert.alert(t(`admin.users.${next}Title`), t("admin.users.confirmStatus", { name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t(`admin.users.${next}`), style: next === "banned" ? "destructive" : "default", onPress: () => statusMutation.mutate({ id: user._id, status: next }) },
    ]);
  };

  return <Screen padded={false}>
    <AdminHeader title={t("admin.navigation.users")} />
    <AdminSearchBar value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={t("admin.common.search")} label={t("admin.users.searchLabel")} />
    <AdminFilters values={types} selected={type} labels={{ admin: t("admin.roles.admin"), worker: t("admin.roles.worker"), client: t("admin.roles.client") }} onSelect={(value) => { setType(value); setPage(1); }} />
    <AdminFilters values={statuses} selected={status} labels={{ active: t("admin.accountStatus.active"), banned: t("admin.accountStatus.banned"), deleted: t("admin.accountStatus.deleted") }} onSelect={(value) => { setStatus(value); setPage(1); }} />
    <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<UserQuery["sort"]>, string>} onSelect={(value) => setSort(value ?? "newest")} />
    {(query.data?.items.length ?? 0) > 0 ? <XStack paddingHorizontal="$4" paddingBottom="$2" gap="$2"><Button size="sm" variant="outline" onPress={() => setPageSelected((value) => !value)}>{pageSelected ? t("admin.bulk.clear") : t("admin.bulk.selectPage")}</Button>{pageSelected ? <><Button size="sm" onPress={() => bulkStatus("active")}>{t("admin.users.active")}</Button><Button size="sm" variant="destructive" onPress={() => bulkStatus("banned")}>{t("admin.users.banned")}</Button></> : null}</XStack> : null}
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : (
      <FlatList data={query.data?.items ?? []} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListEmptyComponent={<EmptyState title={t("admin.users.empty")} />} renderItem={({ item }) => {
        const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email;
        const userType = item.role === "admin" ? "admin" : item.role === "worker" || item.workerProfile ? "worker" : "client";
        return <Pressable onPress={() => navigation.navigate("AdminUserDetail", { userId: item._id })} role="button" aria-label={t("admin.users.viewUser", { name })}>
          <Card elevated><XStack gap="$3" alignItems="center"><Avatar uri={item.photoUrl} name={name} size={54} /><YStack flex={1} gap="$1"><Text variant="h4" numberOfLines={1}>{name}</Text><Text variant="caption" numberOfLines={1}>{item.email}</Text><Text variant="caption">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.createdAt))} · {t(`admin.roles.${userType}`)}</Text></YStack><YStack alignItems="flex-end" gap="$2"><StatusPill label={t(`admin.accountStatus.${item.status}`)} tone={item.status === "active" ? "active" : item.status === "banned" ? "danger" : "neutral"} /><Pressable onPress={() => act(item)} role="button" aria-label={t("admin.common.actions")} hitSlop={10}><Ionicons name="ellipsis-vertical" size={24} color="#2C312A" /></Pressable></YStack></XStack></Card>
        </Pressable>;
      }} ListFooterComponent={<XStack justifyContent="space-between" alignItems="center" paddingTop="$3"><Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button><Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil((query.data?.total ?? 0) / 20)) })}</Text><Button size="sm" variant="outline" disabled={page * 20 >= (query.data?.total ?? 0)} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button></XStack>} />
    )}
  </Screen>;
}
