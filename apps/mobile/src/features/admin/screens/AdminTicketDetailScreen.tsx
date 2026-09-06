import { Alert, type AlertButton } from "react-native";
import { XStack, YStack } from "tamagui";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminTicket, useNoteAdminTicket, useReplyAdminTicket, useUpdateAdminTicket } from "../hooks/useAdmin";
import type { TicketPriority, TicketStatus } from "../types/admin.types";
import type { AdminStackParamList } from "@/navigation/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/features/auth/store/authStore";

export function AdminTicketDetailScreen({ route }: NativeStackScreenProps<AdminStackParamList, "AdminTicketDetail">) {
  const { t, i18n } = useTranslation(); const currentAdmin = useAuthStore((state) => state.user); const query = useAdminTicket(route.params.ticketId); const update = useUpdateAdminTicket(); const replyMutation = useReplyAdminTicket(); const noteMutation = useNoteAdminTicket(); const [reply, setReply] = useState(""); const [note, setNote] = useState("");
  if (query.isLoading) return <Screen padded={false}><AdminHeader title={t("admin.tickets.details")} showBack /><LoadingState /></Screen>;
  if (query.isError || !query.data) return <Screen padded={false}><AdminHeader title={t("admin.tickets.details")} showBack /><ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /></Screen>;
  const { ticket, audits } = query.data; const reporter = `${ticket.reporterId.firstName ?? ""} ${ticket.reporterId.lastName ?? ""}`.trim() || ticket.reporterId.email;
  const chooseStatus = () => {
    const buttons: AlertButton[] = (["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((status) => ({ text: t(`admin.ticketStatus.${status}`), onPress: () => update.mutate({ id: ticket._id, status }) }));
    if (!ticket.assignedAdminId && currentAdmin) buttons.push({ text: t("admin.actions.assignToMe"), onPress: () => update.mutate({ id: ticket._id, assignedAdminId: currentAdmin.id }) });
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(t("admin.tickets.changeStatus"), undefined, buttons);
  };
  const choosePriority = () => {
    const buttons: AlertButton[] = (["low", "normal", "high", "urgent"] as TicketPriority[]).map((priority) => ({ text: t(`admin.priority.${priority}`), onPress: () => update.mutate({ id: ticket._id, priority }) }));
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(t("admin.tickets.changePriority"), undefined, buttons);
  };
  return <Screen scroll padded={false}><AdminHeader title={t("admin.tickets.details")} showBack /><YStack padding="$4" gap="$4"><Card elevated><XStack justifyContent="space-between"><Text variant="h3">{t(`problem.reasons.${ticket.reason}`)}</Text><YStack gap="$2"><StatusPill label={t(`admin.ticketStatus.${ticket.status}`)} tone="brand" /><StatusPill label={t(`admin.priority.${ticket.priority}`)} tone={ticket.priority === "urgent" || ticket.priority === "high" ? "danger" : "neutral"} /></YStack></XStack><Text>{ticket.note || t("admin.tickets.noDescription")}</Text></Card><Card><Detail label={t("admin.tickets.reporter")} value={`${reporter} (${ticket.reporterId.email})`} /><Detail label={t("admin.tickets.relatedJob")} value={ticket.jobId?.title ?? "—"} /><Detail label={t("admin.tickets.assignee")} value={ticket.assignedAdminId ? `${ticket.assignedAdminId.firstName ?? ""} ${ticket.assignedAdminId.lastName ?? ""}`.trim() || ticket.assignedAdminId.email : t("admin.tickets.unassigned")} /><Detail label={t("admin.tickets.created")} value={new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.createdAt))} /></Card><XStack gap="$2"><Button flex={1} variant="outline" onPress={chooseStatus}>{t("admin.tickets.changeStatus")}</Button><Button flex={1} variant="outline" onPress={choosePriority}>{t("admin.tickets.changePriority")}</Button></XStack><Card><Text variant="h4">{t("admin.tickets.conversation")}</Text>{ticket.replies.length ? ticket.replies.map((item) => <YStack key={item._id} backgroundColor="$brand50" padding="$3" borderRadius="$md"><Text variant="small" fontWeight="600">{item.authorRole === "admin" ? t("admin.roles.admin") : reporter}</Text><Text>{item.message}</Text><Text variant="caption">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}</Text></YStack>) : <Text muted>{t("admin.common.noData")}</Text>}<Input label={t("admin.tickets.reply")} value={reply} onChangeText={setReply} multiline /><Button size="sm" disabled={!reply.trim()} loading={replyMutation.isPending} onPress={() => replyMutation.mutate({ id: ticket._id, message: reply.trim() }, { onSuccess: () => setReply("") })}>{t("admin.tickets.sendReply")}</Button></Card><Card><Text variant="h4">{t("admin.tickets.internalNotes")}</Text>{ticket.internalNotes.map((item) => <Text key={item._id} variant="small">{item.note}</Text>)}<Input label={t("admin.tickets.note")} value={note} onChangeText={setNote} multiline /><Button size="sm" variant="outline" disabled={!note.trim()} loading={noteMutation.isPending} onPress={() => noteMutation.mutate({ id: ticket._id, note: note.trim() }, { onSuccess: () => setNote("") })}>{t("admin.tickets.addNote")}</Button></Card><Card><Text variant="h4">{t("admin.users.audit")}</Text>{audits.length ? audits.map((entry) => <Text key={entry._id} variant="small">{entry.action}</Text>) : <Text muted>{t("admin.common.noData")}</Text>}</Card></YStack></Screen>;
}
function Detail({ label, value }: { label: string; value: string }) { return <XStack justifyContent="space-between" gap="$3"><Text muted>{label}</Text><Text flex={1} textAlign="right">{value}</Text></XStack>; }
