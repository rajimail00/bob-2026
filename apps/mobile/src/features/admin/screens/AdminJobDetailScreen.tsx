import { Alert, Image, type AlertButton } from "react-native";
import { ScrollView } from "react-native";
import { XStack, YStack } from "tamagui";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminJob, useCancelAdminJob, useModerateAdminJob } from "../hooks/useAdmin";
import type { ModerationStatus } from "../types/admin.types";
import type { AdminStackParamList } from "@/navigation/types";
import { useTranslation } from "react-i18next";

export function AdminJobDetailScreen({ route }: NativeStackScreenProps<AdminStackParamList, "AdminJobDetail">) {
  const { t, i18n } = useTranslation(); const query = useAdminJob(route.params.jobId); const moderate = useModerateAdminJob(); const cancel = useCancelAdminJob();
  if (query.isLoading) return <Screen padded={false}><AdminHeader title={t("admin.jobs.details")} showBack /><LoadingState /></Screen>;
  if (query.isError || !query.data) return <Screen padded={false}><AdminHeader title={t("admin.jobs.details")} showBack /><ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /></Screen>;
  const { job, related } = query.data; const owner = `${job.clientId.firstName ?? ""} ${job.clientId.lastName ?? ""}`.trim() || job.clientId.email;
  const chooseModeration = () => {
    const allowed: Record<ModerationStatus, ModerationStatus[]> = { pending: ["approved", "rejected"], approved: ["suspended"], rejected: ["approved"], suspended: ["approved"] };
    const buttons: AlertButton[] = allowed[job.moderationStatus ?? "approved"].map((status) => ({ text: t(`admin.moderation.${status}`), onPress: () => moderate.mutate({ id: job._id, status }) }));
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(t("admin.jobs.moderate"), undefined, buttons);
  };
  const canCancel = ["active", "offer_pending", "assigned"].includes(job.status);
  return <Screen scroll padded={false}><AdminHeader title={t("admin.jobs.details")} showBack /><YStack padding="$4" gap="$4">{job.media.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{job.media.filter((item) => item.type === "photo").map((item) => <Image key={item.url} source={{ uri: item.url }} style={{ width: 260, height: 170, borderRadius: 14, marginRight: 8 }} />)}</ScrollView> : null}<Card elevated><Text variant="h3">{job.title}</Text><XStack gap="$2"><StatusPill label={t(`jobs.status.${job.status}`)} tone={job.status === "active" ? "active" : "neutral"} /><StatusPill label={t(`admin.moderation.${job.moderationStatus ?? "approved"}`)} tone={job.moderationStatus === "approved" ? "brand" : "danger"} /></XStack><Text>{job.description}</Text></Card><Card elevated><Detail label={t("admin.jobs.owner")} value={`${owner} (${job.clientId.email})`} /><Detail label={t("admin.jobs.worker")} value={job.assignedWorkerId ? `${job.assignedWorkerId.firstName ?? ""} ${job.assignedWorkerId.lastName ?? ""}`.trim() || job.assignedWorkerId.email : "—"} /><Detail label={t("admin.jobs.category")} value={job.categoryId.name[i18n.language as keyof typeof job.categoryId.name] ?? job.categoryId.name.en} /><Detail label={t("admin.jobs.address")} value={job.address} /><Detail label={t("admin.jobs.schedule")} value={new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeStyle: "short" }).format(new Date(job.date))} /><Detail label={t("admin.jobs.budget")} value={new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" }).format(job.budget)} /><Detail label={t("admin.jobs.people")} value={String(job.peopleNeeded)} /></Card><Card elevated><Text variant="h4">{t("admin.jobs.related")}</Text><Detail label={t("admin.jobs.applications")} value={String(related.applications.length)} /><Detail label={t("admin.jobs.messages")} value={String(related.messageCount)} /><Detail label={t("admin.jobs.reports")} value={String(related.tickets.length)} /></Card><Card><Text variant="h4">{t("admin.jobs.history")}</Text>{[...job.statusHistory, ...job.moderationHistory].length ? [...job.statusHistory.map((item) => `${item.from} → ${item.to} · ${new Intl.DateTimeFormat(i18n.language).format(new Date(item.createdAt))}`), ...job.moderationHistory.map((item) => `${item.from} → ${item.to} · ${new Intl.DateTimeFormat(i18n.language).format(new Date(item.createdAt))}`)].map((line, index) => <Text key={`${line}-${index}`} variant="small">{line}</Text>) : <Text muted>{t("admin.common.noData")}</Text>}</Card><XStack gap="$2"><Button flex={1} variant="outline" loading={moderate.isPending} onPress={chooseModeration}>{t("admin.jobs.moderate")}</Button>{canCancel ? <Button flex={1} variant="destructive" loading={cancel.isPending} onPress={() => Alert.alert(t("admin.jobs.cancelTitle"), job.title, [{ text: t("common.cancel"), style: "cancel" }, { text: t("admin.jobs.cancelJob"), style: "destructive", onPress: () => cancel.mutate(job._id) }])}>{t("admin.jobs.cancelJob")}</Button> : null}</XStack></YStack></Screen>;
}
function Detail({ label, value }: { label: string; value: string }) { return <XStack justifyContent="space-between" gap="$3"><Text muted>{label}</Text><Text flex={1} textAlign="right">{value}</Text></XStack>; }
