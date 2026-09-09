import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import type { AdminStackParamList } from "@/navigation/types";
import { AdminFilterSection, AdminFilterSheet } from "../components/AdminFilterSheet";
import { AdminFilters } from "../components/AdminFilters";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminTickets, useAdminUsers, useBulkUpdateAdminTickets } from "../hooks/useAdmin";
import type { Ticket, TicketPriority, TicketQuery, TicketStatus } from "../types/admin.types";

const statuses: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const priorities: TicketPriority[] = ["low", "normal", "high", "urgent"];
const sorts: NonNullable<TicketQuery["sort"]>[] = ["newest", "oldest", "priority", "updated"];
const reasons: Ticket["reason"][] = ["cancel", "address_not_found", "no_show", "other"];

export function AdminTicketsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus>();
  const [priority, setPriority] = useState<TicketPriority>();
  const [reason, setReason] = useState<Ticket["reason"]>();
  const [assignedAdminId, setAssignedAdminId] = useState<string>();
  const [sort, setSort] = useState<NonNullable<TicketQuery["sort"]>>("updated");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const longPressHandled = useRef(false);
  const admins = useAdminUsers({ type: "admin", status: "active", pageSize: 50 });
  const query = useAdminTickets({
    page,
    pageSize: 20,
    search: useDeferredValue(search) || undefined,
    status,
    priority,
    reason,
    assignedAdminId,
    sort,
  });
  const bulkMutation = useBulkUpdateAdminTickets();

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    exitSelectionMode();
  }, [assignedAdminId, exitSelectionMode, priority, reason, search, sort, status]);

  useEffect(() => {
    if (!selectionMode) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      exitSelectionMode();
      return true;
    });
    return () => subscription.remove();
  }, [exitSelectionMode, selectionMode]);

  const clearFilters = () => {
    setStatus(undefined);
    setPriority(undefined);
    setReason(undefined);
    setAssignedAdminId(undefined);
    setSort("updated");
    setPage(1);
  };

  const adminLabels = Object.fromEntries((admins.data?.items ?? []).map((admin) => [
    admin._id,
    `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || admin.email,
  ]));
  const selectedAdminLabel = assignedAdminId ? adminLabels[assignedAdminId] : undefined;
  const activeFilters = [
    ...(status ? [{ key: "status", label: t(`admin.ticketStatus.${status}`), onRemove: () => { setStatus(undefined); setPage(1); } }] : []),
    ...(priority ? [{ key: "priority", label: t(`admin.priority.${priority}`), onRemove: () => { setPriority(undefined); setPage(1); } }] : []),
    ...(reason ? [{ key: "reason", label: t(`problem.reasons.${reason}`), onRemove: () => { setReason(undefined); setPage(1); } }] : []),
    ...(assignedAdminId ? [{ key: "assignee", label: selectedAdminLabel ?? t("admin.tickets.assignee"), onRemove: () => { setAssignedAdminId(undefined); setPage(1); } }] : []),
    ...(sort !== "updated" ? [{ key: "sort", label: t(`admin.sort.${sort}`), onRemove: () => { setSort("updated"); setPage(1); } }] : []),
  ];

  const toggleSelection = (ticket: Ticket) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(ticket._id)) next.delete(ticket._id);
      else next.add(ticket._id);
      return next;
    });
  };

  const bulkStatus = (nextStatus: TicketStatus) => {
    const ticketIds = Array.from(selectedIds);
    if (ticketIds.length === 0) return;
    Alert.alert(
      t("admin.bulk.confirmTitle"),
      t("admin.bulk.confirmBody", { count: ticketIds.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t(`admin.ticketStatus.${nextStatus}`),
          onPress: () => bulkMutation.mutate({ ticketIds, status: nextStatus }, { onSuccess: exitSelectionMode }),
        },
      ]
    );
  };

  return (
    <Screen padded={false} safeAreaEdges={["top", "left", "right"]}>
      <AdminHeader title={t("admin.navigation.tickets")} />
      <AdminSearchBar
        value={search}
        onChangeText={(value) => { setSearch(value); setPage(1); }}
        placeholder={t("admin.common.search")}
        label={t("admin.tickets.searchLabel")}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeFilters.length}
      />
      <AdminFilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clearFilters} hasActiveFilters={activeFilters.length > 0}>
        <AdminFilterSection title={t("admin.tickets.changeStatus")}>
          <AdminFilters values={statuses} selected={status} labels={Object.fromEntries(statuses.map((value) => [value, t(`admin.ticketStatus.${value}`)])) as Record<TicketStatus, string>} onSelect={(value) => { setStatus(value); setPage(1); }} />
        </AdminFilterSection>
        <AdminFilterSection title={t("admin.tickets.changePriority")}>
          <AdminFilters values={priorities} selected={priority} labels={Object.fromEntries(priorities.map((value) => [value, t(`admin.priority.${value}`)])) as Record<TicketPriority, string>} onSelect={(value) => { setPriority(value); setPage(1); }} />
        </AdminFilterSection>
        <AdminFilterSection title={t("admin.tickets.reason")}>
          <AdminFilters values={reasons} selected={reason} labels={Object.fromEntries(reasons.map((value) => [value, t(`problem.reasons.${value}`)])) as Record<Ticket["reason"], string>} onSelect={(value) => { setReason(value); setPage(1); }} />
        </AdminFilterSection>
        {(admins.data?.items.length ?? 0) > 0 ? (
          <AdminFilterSection title={t("admin.tickets.assignee")}>
            <AdminFilters values={admins.data?.items.map((item) => item._id) ?? []} selected={assignedAdminId} labels={adminLabels} onSelect={(value) => { setAssignedAdminId(value); setPage(1); }} />
          </AdminFilterSection>
        ) : null}
        <AdminFilterSection title={t("admin.filterGroups.sortBy")}>
          <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<TicketQuery["sort"]>, string>} onSelect={(value) => { setSort(value ?? "updated"); setPage(1); }} />
        </AdminFilterSection>
      </AdminFilterSheet>

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
          ListHeaderComponent={<Text variant="small" color="$primary">{t("admin.tickets.unresolved", { count: query.data?.unresolvedCount ?? 0 })}</Text>}
          ListEmptyComponent={<EmptyState title={t("admin.tickets.empty")} />}
          renderItem={({ item }) => {
            const reporter = `${item.reporterId?.firstName ?? ""} ${item.reporterId?.lastName ?? ""}`.trim() || item.reporterId?.email || t("admin.tickets.unknownUser");
            const reasonLabel = t(`problem.reasons.${item.reason}`);
            const selected = selectedIds.has(item._id);
            return (
              <Pressable
                onPressIn={() => { longPressHandled.current = false; }}
                onPress={() => {
                  if (longPressHandled.current) {
                    longPressHandled.current = false;
                    return;
                  }
                  if (selectionMode) toggleSelection(item);
                  else navigation.navigate("AdminTicketDetail", { ticketId: item._id });
                }}
                onLongPress={() => {
                  longPressHandled.current = true;
                  toggleSelection(item);
                }}
                delayLongPress={350}
                role="button"
                aria-label={selectionMode ? t("admin.bulk.toggleTicket", { reason: reasonLabel }) : t("admin.tickets.viewTicket")}
              >
                <Card elevated backgroundColor={selected ? "$brand100" : "$backgroundStrong"}>
                  <XStack gap="$3" alignItems="center">
                    {selectionMode ? <Ionicons name={selected ? "checkbox" : "square-outline"} size={25} color="#4F8266" /> : null}
                    <YStack flex={1} gap="$1">
                      <Text variant="h4" numberOfLines={1}>{reasonLabel}</Text>
                      <Text variant="small" numberOfLines={1}>{reporter}</Text>
                      <Text variant="caption" numberOfLines={2}>{item.note || t("admin.tickets.noDescription")}</Text>
                      <Text variant="caption">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</Text>
                    </YStack>
                    <YStack gap="$2" alignItems="flex-end">
                      <StatusPill label={t(`admin.ticketStatus.${item.status}`)} tone={item.status === "resolved" || item.status === "closed" ? "brand" : "active"} />
                      <StatusPill label={t(`admin.priority.${item.priority}`)} tone={item.priority === "urgent" || item.priority === "high" ? "danger" : "neutral"} />
                      {!selectionMode ? <Ionicons name="ellipsis-vertical" size={22} color="#2C312A" /> : null}
                    </YStack>
                  </XStack>
                </Card>
              </Pressable>
            );
          }}
          ListFooterComponent={query.data && query.data.total > 0 ? (
            <XStack justifyContent="space-between" alignItems="center" paddingTop="$3">
              <Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button>
              <Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil(query.data.total / 20)) })}</Text>
              <Button size="sm" variant="outline" disabled={page * 20 >= query.data.total} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button>
            </XStack>
          ) : null}
        />
      )}

      {selectionMode ? (
        <YStack position="absolute" left={0} right={0} bottom={0} backgroundColor="$backgroundStrong" borderTopWidth={1} borderColor="$borderColor" paddingHorizontal="$4" paddingVertical="$3" gap="$2" elevation={8}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="caption">{t("admin.bulk.ticketSelectedCount", { count: selectedIds.size })}</Text>
            <Pressable onPress={exitSelectionMode} role="button" aria-label={t("common.cancel")} hitSlop={10}><Ionicons name="close" size={23} color="#2C312A" /></Pressable>
          </XStack>
          <XStack gap="$2">
            <Button flex={1} size="sm" disabled={selectedIds.size === 0} loading={bulkMutation.isPending} onPress={() => bulkStatus("in_progress")}>{t("admin.ticketStatus.in_progress")}</Button>
            <Button flex={1} size="sm" disabled={selectedIds.size === 0} loading={bulkMutation.isPending} onPress={() => bulkStatus("resolved")}>{t("admin.ticketStatus.resolved")}</Button>
            <Button flex={1} size="sm" variant="outline" disabled={bulkMutation.isPending} onPress={exitSelectionMode}>{t("common.cancel")}</Button>
          </XStack>
        </YStack>
      ) : null}
    </Screen>
  );
}
