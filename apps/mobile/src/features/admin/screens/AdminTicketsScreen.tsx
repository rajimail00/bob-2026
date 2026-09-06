import { useDeferredValue, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl } from "react-native";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminFilters } from "../components/AdminFilters";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminTickets, useAdminUsers, useBulkUpdateAdminTickets } from "../hooks/useAdmin";
import type { Ticket, TicketPriority, TicketQuery, TicketStatus } from "../types/admin.types";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

const statuses: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const priorities: TicketPriority[] = ["low", "normal", "high", "urgent"];
const sorts: NonNullable<TicketQuery["sort"]>[] = ["newest", "oldest", "priority", "updated"];
const reasons: Ticket["reason"][] = ["cancel", "address_not_found", "no_show", "other"];
export function AdminTicketsScreen() {
  const { t, i18n } = useTranslation(); const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<TicketStatus>(); const [priority, setPriority] = useState<TicketPriority>(); const [sort, setSort] = useState<NonNullable<TicketQuery["sort"]>>("updated"); const [page, setPage] = useState(1); const [pageSelected, setPageSelected] = useState(false); const [reason, setReason] = useState<Ticket["reason"]>(); const [assignedAdminId, setAssignedAdminId] = useState<string>(); const bulk = useBulkUpdateAdminTickets(); const admins = useAdminUsers({ type: "admin", status: "active", pageSize: 50 });
  const query = useAdminTickets({ page, pageSize: 20, search: useDeferredValue(search) || undefined, status, priority, reason, assignedAdminId, sort });
  const bulkStatus = (nextStatus: TicketStatus) => { const ticketIds = (query.data?.items ?? []).map((item) => item._id); Alert.alert(t("admin.bulk.confirmTitle"), t("admin.bulk.confirmBody", { count: ticketIds.length }), [{ text: t("common.cancel"), style: "cancel" }, { text: t(`admin.ticketStatus.${nextStatus}`), onPress: () => bulk.mutate({ ticketIds, status: nextStatus }, { onSuccess: () => setPageSelected(false) }) }]); };
  return <Screen padded={false} safeAreaEdges={["top", "left", "right"]}><AdminHeader title={t("admin.navigation.tickets")} /><AdminSearchBar value={search} onChangeText={setSearch} placeholder={t("admin.common.search")} label={t("admin.tickets.searchLabel")} />
    <AdminFilters values={statuses} selected={status} labels={Object.fromEntries(statuses.map((value) => [value, t(`admin.ticketStatus.${value}`)])) as Record<TicketStatus, string>} onSelect={setStatus} />
    <AdminFilters values={priorities} selected={priority} labels={Object.fromEntries(priorities.map((value) => [value, t(`admin.priority.${value}`)])) as Record<TicketPriority, string>} onSelect={setPriority} />
    <AdminFilters values={reasons} selected={reason} labels={Object.fromEntries(reasons.map((value) => [value, t(`problem.reasons.${value}`)])) as Record<Ticket["reason"], string>} onSelect={setReason} />
    {admins.data?.items.length ? <AdminFilters values={admins.data.items.map((item) => item._id)} selected={assignedAdminId} labels={Object.fromEntries(admins.data.items.map((item) => [item._id, `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email]))} onSelect={setAssignedAdminId} /> : null}
    <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<TicketQuery["sort"]>, string>} onSelect={(value) => setSort(value ?? "updated")} />
    <XStack paddingHorizontal="$4" paddingBottom="$2"><Text variant="small" color="$primary">{t("admin.tickets.unresolved", { count: query.data?.unresolvedCount ?? 0 })}</Text></XStack>
    {(query.data?.items.length ?? 0) > 0 ? <XStack paddingHorizontal="$4" paddingBottom="$2" gap="$2"><Button size="sm" variant="outline" onPress={() => setPageSelected((value) => !value)}>{pageSelected ? t("admin.bulk.clear") : t("admin.bulk.selectPage")}</Button>{pageSelected ? <><Button size="sm" onPress={() => bulkStatus("in_progress")}>{t("admin.ticketStatus.in_progress")}</Button><Button size="sm" onPress={() => bulkStatus("resolved")}>{t("admin.ticketStatus.resolved")}</Button></> : null}</XStack> : null}
    <XStack paddingHorizontal="$4" paddingBottom="$2" justifyContent="space-between"><Button size="sm" variant="ghost" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button><Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil((query.data?.total ?? 0) / 20)) })}</Text><Button size="sm" variant="ghost" disabled={page * 20 >= (query.data?.total ?? 0)} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button></XStack>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : <FlatList data={query.data?.items ?? []} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListEmptyComponent={<EmptyState title={t("admin.tickets.empty")} />} renderItem={({ item }) => { const reporter = `${item.reporterId?.firstName ?? ""} ${item.reporterId?.lastName ?? ""}`.trim() || item.reporterId?.email || t("admin.tickets.unknownUser"); return <Pressable onPress={() => navigation.navigate("AdminTicketDetail", { ticketId: item._id })} role="button" aria-label={t("admin.tickets.viewTicket")}><Card elevated><XStack justifyContent="space-between" gap="$3"><YStack flex={1} gap="$1"><Text variant="h4">{t(`problem.reasons.${item.reason}`)}</Text><Text variant="small">{reporter}</Text><Text variant="caption" numberOfLines={2}>{item.note || t("admin.tickets.noDescription")}</Text><Text variant="caption">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</Text></YStack><YStack gap="$2" alignItems="flex-end"><StatusPill label={t(`admin.ticketStatus.${item.status}`)} tone={item.status === "resolved" || item.status === "closed" ? "brand" : "active"} /><StatusPill label={t(`admin.priority.${item.priority}`)} tone={item.priority === "urgent" || item.priority === "high" ? "danger" : "neutral"} /></YStack></XStack></Card></Pressable>; }} />}
  </Screen>;
}
