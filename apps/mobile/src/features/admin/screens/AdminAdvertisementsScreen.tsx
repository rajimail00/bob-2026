import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, FlatList, Image, Modal, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdvertisementCard } from "@/features/advertisements/components/AdvertisementCard";
import type { Advertisement, AdvertisementEffectiveStatus } from "@/features/advertisements/types/advertisement.types";
import type { AdminStackParamList } from "@/navigation/types";
import { AdminFilterSection, AdminFilterSheet } from "../components/AdminFilterSheet";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminAdvertisements, useArchiveAdminAdvertisement, useDeleteAdminAdvertisement, usePauseAdminAdvertisement, usePublishAdminAdvertisement } from "../hooks/useAdmin";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminAdvertisements">;
const statuses: AdvertisementEffectiveStatus[] = ["draft", "scheduled", "active", "paused", "expired", "archived"];

function statusTone(status: AdvertisementEffectiveStatus): StatusTone {
  if (status === "active") return "active";
  if (status === "scheduled") return "brand";
  if (status === "archived" || status === "expired") return "neutral";
  if (status === "paused") return "danger";
  return "neutral";
}

export function AdminAdvertisementsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdvertisementEffectiveStatus>();
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preview, setPreview] = useState<Advertisement>();
  const query = useAdminAdvertisements({ page, pageSize: 10, search: search.trim() || undefined, status });
  const publish = usePublishAdminAdvertisement();
  const pause = usePauseAdminAdvertisement();
  const archive = useArchiveAdminAdvertisement();
  const remove = useDeleteAdminAdvertisement();
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  const date = (value?: string) => value ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

  const confirmAction = (item: Advertisement, action: "pause" | "archive" | "delete") => {
    Alert.alert(t(`admin.advertisements.${action}Title`), t("admin.advertisements.confirmBody", { title: item.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(`admin.advertisements.${action}`),
        style: action === "delete" ? "destructive" : "default",
        onPress: () => {
          if (action === "pause") pause.mutate(item._id);
          else if (action === "archive") archive.mutate(item._id);
          else remove.mutate(item._id);
        },
      },
    ]);
  };

  return (
    <Screen padded={false} safeAreaEdges={["top", "left", "right"]}>
      <AdminHeader title={t("admin.advertisements.title")} showBack />
      <AdminSearchBar value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={t("admin.common.search")} label={t("admin.advertisements.searchLabel")} onOpenFilters={() => setFiltersOpen(true)} activeFilterCount={status ? 1 : 0} />
      <XStack paddingHorizontal="$4" paddingVertical="$3"><Button fullWidth size="sm" onPress={() => navigation.navigate("AdminAdvertisementForm")}>{t("admin.advertisements.create")}</Button></XStack>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title={t("admin.advertisements.empty")} />}
          renderItem={({ item }) => {
            const effectiveStatus = item.effectiveStatus ?? item.status;
            const busy = publish.isPending || pause.isPending || archive.isPending || remove.isPending;
            const canPublish = (item.status === "draft" || item.status === "paused") && Boolean(item.media) && Boolean(item.endsAt && new Date(item.endsAt) > new Date());
            return <Card elevated gap="$3">
              <XStack gap="$3" alignItems="center">
                <YStack width={72} height={72} borderRadius="$md" overflow="hidden" backgroundColor="$brand100" alignItems="center" justifyContent="center">
                  {item.media?.type === "image" ? <Image source={{ uri: item.media.url }} style={{ width: 72, height: 72 }} resizeMode="cover" /> : <Ionicons name={item.media?.type === "video" ? "videocam-outline" : "image-outline"} size={30} color="#4F8266" />}
                </YStack>
                <YStack flex={1} gap="$1"><Text variant="h4" numberOfLines={1}>{item.title}</Text><Text variant="caption">{t(`admin.advertisements.mediaTypes.${item.media?.type ?? "none"}`)} · {t(`admin.advertisements.audiences.${item.audience}`)}</Text><StatusPill label={t(`admin.advertisements.statuses.${effectiveStatus}`)} tone={statusTone(effectiveStatus)} /></YStack>
              </XStack>
              <YStack gap="$1"><Text variant="caption">{t("admin.advertisements.startsAt")}: {date(item.startsAt)}</Text><Text variant="caption">{t("admin.advertisements.endsAt")}: {date(item.endsAt)}</Text><Text variant="caption">{t("admin.advertisements.placement")}: {t("admin.advertisements.homeList")} · {t("admin.advertisements.priority")}: {item.priority}</Text><Text variant="caption">{t("admin.advertisements.createdAt")}: {date(item.createdAt)}</Text><Text variant="caption">{t("admin.advertisements.updatedAt")}: {date(item.updatedAt)}</Text></YStack>
              <XStack flexWrap="wrap" gap="$2">
                <Button size="sm" variant="outline" onPress={() => setPreview(item)}>{t("admin.advertisements.preview")}</Button>
                <Button size="sm" variant="outline" onPress={() => navigation.navigate("AdminAdvertisementForm", { advertisementId: item._id })}>{t("admin.advertisements.edit")}</Button>
                {canPublish ? <Button size="sm" disabled={busy} onPress={() => publish.mutate(item._id)}>{t("admin.advertisements.publish")}</Button> : null}
                {item.status === "active" ? <Button size="sm" variant="outline" disabled={busy} onPress={() => confirmAction(item, "pause")}>{t("admin.advertisements.pause")}</Button> : null}
                {item.status !== "archived" ? <Button size="sm" variant="outline" disabled={busy} onPress={() => confirmAction(item, "archive")}>{t("admin.advertisements.archive")}</Button> : null}
                <Button size="sm" variant="destructive" disabled={busy} onPress={() => confirmAction(item, "delete")}>{t("admin.advertisements.delete")}</Button>
              </XStack>
            </Card>;
          }}
          ListFooterComponent={<XStack paddingTop="$3" justifyContent="space-between" alignItems="center"><Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((current) => current - 1)}>{t("admin.common.previous")}</Button><Text variant="caption">{t("admin.common.page", { page, total: totalPages })}</Text><Button size="sm" variant="outline" disabled={page >= totalPages} onPress={() => setPage((current) => current + 1)}>{t("admin.common.next")}</Button></XStack>}
        />
      )}
      <AdminFilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={() => { setStatus(undefined); setPage(1); }} hasActiveFilters={Boolean(status)}><AdminFilterSection title={t("admin.advertisements.status")}><XStack flexWrap="wrap" gap="$2">{statuses.map((value) => <Button key={value} size="sm" variant={status === value ? "primary" : "outline"} onPress={() => { setStatus(status === value ? undefined : value); setPage(1); }}>{t(`admin.advertisements.statuses.${value}`)}</Button>)}</XStack></AdminFilterSection></AdminFilterSheet>
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(undefined)}><SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 20 }}><YStack backgroundColor="$background" borderRadius="$lg" padding="$3" gap="$3"><XStack justifyContent="space-between" alignItems="center"><Text variant="h3">{t("admin.advertisements.preview")}</Text><Pressable onPress={() => setPreview(undefined)} role="button" aria-label={t("admin.advertisements.closePreview")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={26} color="#2C312A" /></Pressable></XStack>{preview ? <AdvertisementCard advertisement={preview} /> : null}</YStack></SafeAreaView></Modal>
    </Screen>
  );
}
