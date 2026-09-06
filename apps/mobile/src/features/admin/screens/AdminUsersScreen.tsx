import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Alert, BackHandler, FlatList, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
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
import { useAuthStore } from "@/features/auth/store/authStore";
import type { AdminStackParamList } from "@/navigation/types";
import { AdminFilters } from "../components/AdminFilters";
import { AdminActiveFilters, AdminFilterSection, AdminFilterSheet } from "../components/AdminFilterSheet";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminUsers, useBulkAdminUserStatus, useSetAdminUserStatus } from "../hooks/useAdmin";
import type { AccountStatus, AdminUser, UserQuery } from "../types/admin.types";

const statuses: AccountStatus[] = ["active", "banned", "deleted"];
const types = ["admin", "worker", "client"] as const;
const sorts: NonNullable<UserQuery["sort"]>[] = ["newest", "oldest", "name_asc", "name_desc", "recent_activity"];

export function AdminUsersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus>();
  const [type, setType] = useState<typeof types[number]>();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NonNullable<UserQuery["sort"]>>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const query = useAdminUsers({ page, pageSize: 20, search: useDeferredValue(search) || undefined, status, type, sort });
  const statusMutation = useSetAdminUserStatus();
  const bulkMutation = useBulkAdminUserStatus();

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    exitSelectionMode();
  }, [exitSelectionMode, page, search, sort, status, type]);

  useEffect(() => {
    if (!selectionMode) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      exitSelectionMode();
      return true;
    });
    return () => subscription.remove();
  }, [exitSelectionMode, selectionMode]);

  const clearFilters = () => {
    setType(undefined);
    setStatus(undefined);
    setSort("newest");
    setPage(1);
  };
  const activeFilters = [
    ...(type ? [{ key: "type", label: t(`admin.roles.${type}`), onRemove: () => { setType(undefined); setPage(1); } }] : []),
    ...(status ? [{ key: "status", label: t(`admin.accountStatus.${status}`), onRemove: () => { setStatus(undefined); setPage(1); } }] : []),
    ...(sort !== "newest" ? [{ key: "sort", label: t(`admin.sort.${sort}`), onRemove: () => { setSort("newest"); setPage(1); } }] : []),
  ];
  const selectableUsers = (query.data?.items ?? []).filter((user) => user._id !== currentUserId && user.status !== "deleted");
  const allSelectableUsersSelected = selectableUsers.length > 0 && selectableUsers.every((user) => selectedIds.has(user._id));

  const toggleSelection = (user: AdminUser) => {
    if (user._id === currentUserId || user.status === "deleted") return;
    setSelectionMode(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(user._id)) next.delete(user._id);
      else next.add(user._id);
      return next;
    });
  };

  const bulkStatus = (nextStatus: "active" | "banned") => {
    const userIds = Array.from(selectedIds);
    if (userIds.length === 0) return;
    Alert.alert(
      t("admin.bulk.confirmTitle"),
      t("admin.bulk.confirmBody", { count: userIds.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t(`admin.users.${nextStatus}`),
          style: nextStatus === "banned" ? "destructive" : "default",
          onPress: () => bulkMutation.mutate({ userIds, status: nextStatus }, { onSuccess: exitSelectionMode }),
        },
      ]
    );
  };

  const act = (user: AdminUser) => {
    if (user.status === "deleted") return;
    const next = user.status === "active" ? "banned" : "active";
    Alert.alert(
      t(`admin.users.${next}Title`),
      t("admin.users.confirmStatus", { name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t(`admin.users.${next}`), style: next === "banned" ? "destructive" : "default", onPress: () => statusMutation.mutate({ id: user._id, status: next }) },
      ]
    );
  };

  return (
    <Screen padded={false} safeAreaEdges={["top", "left", "right"]}>
      <AdminHeader title={t("admin.navigation.users")} />
      <AdminSearchBar
        value={search}
        onChangeText={(value) => { setSearch(value); setPage(1); }}
        placeholder={t("admin.common.search")}
        label={t("admin.users.searchLabel")}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeFilters.length}
      />
      <AdminActiveFilters filters={activeFilters} />
      <AdminFilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clearFilters} hasActiveFilters={activeFilters.length > 0}>
        <AdminFilterSection title={t("admin.filterGroups.userType")}>
          <AdminFilters values={types} selected={type} labels={{ admin: t("admin.roles.admin"), worker: t("admin.roles.worker"), client: t("admin.roles.client") }} onSelect={(value) => { setType(value); setPage(1); }} />
        </AdminFilterSection>
        <AdminFilterSection title={t("admin.filterGroups.accountStatus")}>
          <AdminFilters values={statuses} selected={status} labels={{ active: t("admin.accountStatus.active"), banned: t("admin.accountStatus.banned"), deleted: t("admin.accountStatus.deleted") }} onSelect={(value) => { setStatus(value); setPage(1); }} />
        </AdminFilterSection>
        <AdminFilterSection title={t("admin.filterGroups.sortBy")}>
          <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<UserQuery["sort"]>, string>} onSelect={(value) => { setSort(value ?? "newest"); setPage(1); }} />
        </AdminFilterSection>
      </AdminFilterSheet>

      {query.data ? (
        <XStack paddingHorizontal="$4" paddingBottom="$2" alignItems="center" justifyContent="space-between">
          <Text variant="caption">
            {selectionMode
              ? t("admin.bulk.selectedCount", { count: selectedIds.size })
              : t("admin.users.resultCount", { count: query.data.total })}
          </Text>
          {selectionMode ? (
            <Button size="sm" variant="ghost" onPress={() => setSelectedIds(allSelectableUsersSelected ? new Set() : new Set(selectableUsers.map((user) => user._id)))}>
              {allSelectableUsersSelected ? t("admin.bulk.clear") : t("admin.bulk.selectPage")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onPress={() => setSelectionMode(true)}>{t("admin.bulk.selectUsers")}</Button>
          )}
        </XStack>
      ) : null}

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: selectionMode ? 116 : 24 }}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title={t("admin.users.empty")} />}
          renderItem={({ item }) => {
            const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email;
            const userType = item.role === "admin" ? "admin" : item.role === "worker" || item.workerProfile ? "worker" : "client";
            const selected = selectedIds.has(item._id);
            const selectable = item._id !== currentUserId && item.status !== "deleted";
            return (
              <Pressable
                onPress={() => selectionMode ? toggleSelection(item) : navigation.navigate("AdminUserDetail", { userId: item._id })}
                onLongPress={() => toggleSelection(item)}
                delayLongPress={350}
                role="button"
                aria-label={selectionMode ? t("admin.bulk.toggleUser", { name }) : t("admin.users.viewUser", { name })}
              >
                <Card elevated backgroundColor={selected ? "$brand100" : "$backgroundStrong"}>
                  <XStack gap="$3" alignItems="center">
                    {selectionMode ? <Ionicons name={selected ? "checkbox" : "square-outline"} size={25} color={selectable ? "#4F8266" : "#A9AFA7"} /> : null}
                    <Avatar uri={item.photoUrl} name={name} size={54} />
                    <YStack flex={1} gap="$1">
                      <Text variant="h4" numberOfLines={1}>{name}</Text>
                      <Text variant="caption" numberOfLines={1}>{item.email}</Text>
                      <Text variant="caption" numberOfLines={1}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.createdAt))} · {t(`admin.roles.${userType}`)}</Text>
                    </YStack>
                    <YStack alignItems="flex-end" gap="$1">
                      <StatusPill label={t(`admin.accountStatus.${item.status}`)} tone={item.status === "active" ? "active" : item.status === "banned" ? "danger" : "neutral"} />
                      {!selectionMode ? <Pressable onPress={() => act(item)} role="button" aria-label={t("admin.common.actions")} style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}><Ionicons name="ellipsis-vertical" size={24} color="#2C312A" /></Pressable> : null}
                    </YStack>
                  </XStack>
                </Card>
              </Pressable>
            );
          }}
          ListFooterComponent={(
            <XStack justifyContent="space-between" alignItems="center" paddingTop="$3">
              <Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button>
              <Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil((query.data?.total ?? 0) / 20)) })}</Text>
              <Button size="sm" variant="outline" disabled={page * 20 >= (query.data?.total ?? 0)} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button>
            </XStack>
          )}
        />
      )}

      {selectionMode ? (
        <YStack position="absolute" left={0} right={0} bottom={0} backgroundColor="$backgroundStrong" borderTopWidth={1} borderColor="$borderColor" paddingHorizontal="$4" paddingVertical="$3" gap="$2" elevation={8}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="caption">{t("admin.bulk.selectedCount", { count: selectedIds.size })}</Text>
            <Pressable onPress={exitSelectionMode} role="button" aria-label={t("common.cancel")} hitSlop={10}><Ionicons name="close" size={23} color="#2C312A" /></Pressable>
          </XStack>
          <XStack gap="$2">
            <Button flex={1} size="sm" disabled={selectedIds.size === 0} onPress={() => bulkStatus("active")}>{t("admin.users.active")}</Button>
            <Button flex={1} size="sm" variant="destructive" disabled={selectedIds.size === 0} onPress={() => bulkStatus("banned")}>{t("admin.users.banned")}</Button>
            <Button flex={1} size="sm" variant="outline" onPress={exitSelectionMode}>{t("common.cancel")}</Button>
          </XStack>
        </YStack>
      ) : null}
    </Screen>
  );
}
