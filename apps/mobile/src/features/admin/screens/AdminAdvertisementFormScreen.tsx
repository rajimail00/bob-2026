import { useEffect, useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Modal, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import type { AdvertisementAudience, AdvertisementMedia } from "@/features/advertisements/types/advertisement.types";
import type { AdminStackParamList } from "@/navigation/types";
import { AdvertisementMediaPicker } from "../components/AdvertisementMediaPicker";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminAdvertisement, useCreateAdminAdvertisement, useUpdateAdminAdvertisement } from "../hooks/useAdmin";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminAdvertisementForm">;
type PickerState = { field: "startsAt" | "endsAt"; mode: "date" | "time"; value: Date };

function nextHour() {
  const value = new Date(Date.now() + 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return value;
}

function changeDatePart(current: Date, selected: Date) {
  const next = new Date(current);
  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
}

function changeTimePart(current: Date, selected: Date) {
  const next = new Date(current);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
}

export function AdminAdvertisementFormScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const advertisementId = route.params?.advertisementId;
  const query = useAdminAdvertisement(advertisementId);
  const create = useCreateAdminAdvertisement();
  const update = useUpdateAdminAdvertisement();
  const [hydratedId, setHydratedId] = useState<string>();
  const [destinationUrl, setDestinationUrl] = useState("");
  const [media, setMedia] = useState<AdvertisementMedia>();
  const [audience, setAudience] = useState<AdvertisementAudience>("all");
  const [startsAt, setStartsAt] = useState(nextHour);
  const [endsAt, setEndsAt] = useState(() => new Date(nextHour().getTime() + 7 * 24 * 60 * 60 * 1000));
  const [priority, setPriority] = useState("0");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [picker, setPicker] = useState<PickerState>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const advertisement = query.data;
    if (!advertisement || hydratedId === advertisement._id) return;
    setHydratedId(advertisement._id);
    setDestinationUrl(advertisement.destinationUrl ?? "");
    setMedia(advertisement.media);
    setAudience(advertisement.audience);
    if (advertisement.startsAt) setStartsAt(new Date(advertisement.startsAt));
    if (advertisement.endsAt) setEndsAt(new Date(advertisement.endsAt));
    setPriority(String(advertisement.priority));
    if (advertisement.status === "active" || advertisement.status === "draft") setStatus(advertisement.status);
  }, [hydratedId, query.data]);

  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }), [i18n.language]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }), [i18n.language]);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { timeStyle: "short" }), [i18n.language]);
  const existingStatusLocked = Boolean(query.data && query.data.status !== "draft" && query.data.status !== "active");

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPicker(undefined);
    if (event.type === "dismissed" || !selected || !picker) return;
    if (Platform.OS === "ios") {
      setPicker({ ...picker, value: selected });
      return;
    }
    const current = picker.field === "startsAt" ? startsAt : endsAt;
    const next = picker.mode === "date" ? changeDatePart(current, selected) : changeTimePart(current, selected);
    if (picker.field === "startsAt") setStartsAt(next); else setEndsAt(next);
  };

  const openPicker = (field: PickerState["field"], mode: PickerState["mode"]) => {
    setPicker({ field, mode, value: field === "startsAt" ? startsAt : endsAt });
  };

  const confirmIosPicker = () => {
    if (!picker) return;
    const current = picker.field === "startsAt" ? startsAt : endsAt;
    const next = picker.mode === "date" ? changeDatePart(current, picker.value) : changeTimePart(current, picker.value);
    if (picker.field === "startsAt") setStartsAt(next); else setEndsAt(next);
    setPicker(undefined);
  };

  const validate = () => {
    if (destinationUrl.trim()) {
      try {
        if (new URL(destinationUrl.trim()).protocol !== "https:") return t("admin.advertisements.validation.https");
      } catch {
        return t("admin.advertisements.validation.https");
      }
    }
    if (endsAt <= startsAt) return t("admin.advertisements.validation.endAfterStart");
    const numericPriority = Number(priority);
    if (!Number.isInteger(numericPriority) || numericPriority < 0 || numericPriority > 100) return t("admin.advertisements.validation.priority");
    if (!existingStatusLocked && status === "active" && !media) return t("admin.advertisements.validation.mediaRequired");
    if (!existingStatusLocked && status === "active" && endsAt <= new Date()) return t("admin.advertisements.validation.futureEnd");
    return undefined;
  };

  const save = () => {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    const input = {
      destinationUrl: destinationUrl.trim() || null,
      media: media ?? null,
      placement: "home_list" as const,
      audience,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      priority: Number(priority),
    };
    if (advertisementId) {
      update.mutate({ id: advertisementId, input: { ...input, ...(!existingStatusLocked ? { status } : {}) } }, { onSuccess: () => navigation.goBack() });
    } else {
      create.mutate({ ...input, media: media ?? undefined, destinationUrl: destinationUrl.trim() || undefined, status }, { onSuccess: () => navigation.goBack() });
    }
  };

  if (advertisementId && query.isLoading) return <Screen padded={false}><AdminHeader title={t("admin.advertisements.edit")} showBack /><LoadingState /></Screen>;
  if (advertisementId && query.isError) return <Screen padded={false}><AdminHeader title={t("admin.advertisements.edit")} showBack /><ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /></Screen>;

  return (
    <Screen scroll padded={false} scrollBottomPadding={48}>
      <AdminHeader title={advertisementId ? t("admin.advertisements.edit") : t("admin.advertisements.create")} showBack />
      <YStack padding="$4" gap="$4">
        <Card elevated gap="$4">
          <AdvertisementMediaPicker media={media} onChange={setMedia} />
          <Input label={t("admin.advertisements.destinationUrl")} value={destinationUrl} onChangeText={setDestinationUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://" />
          <Input label={t("admin.advertisements.placement")} value={t("admin.advertisements.homeList")} editable={false} />
          <YStack gap="$2"><Text variant="label">{t("admin.advertisements.audience")}</Text><XStack gap="$2"><Button size="sm" flex={1} variant={audience === "all" ? "primary" : "outline"} onPress={() => setAudience("all")}>{t("admin.advertisements.audienceAll")}</Button><Button size="sm" flex={1} variant={audience === "free" ? "primary" : "outline"} onPress={() => setAudience("free")}>{t("admin.advertisements.audienceFree")}</Button></XStack></YStack>
          <DateTimeField label={t("admin.advertisements.startsAt")} dateText={dateFormatter.format(startsAt)} timeText={timeFormatter.format(startsAt)} onDate={() => openPicker("startsAt", "date")} onTime={() => openPicker("startsAt", "time")} />
          <DateTimeField label={t("admin.advertisements.endsAt")} dateText={dateFormatter.format(endsAt)} timeText={timeFormatter.format(endsAt)} onDate={() => openPicker("endsAt", "date")} onTime={() => openPicker("endsAt", "time")} />
          <Text variant="caption">{t("admin.advertisements.scheduleSummary", { start: formatter.format(startsAt), end: formatter.format(endsAt) })}</Text>
          <Input label={t("admin.advertisements.priority")} value={priority} onChangeText={setPriority} keyboardType="number-pad" helperText={t("admin.advertisements.priorityHint")} />
          {existingStatusLocked ? <YStack gap="$2"><Text variant="label">{t("admin.advertisements.status")}</Text><Text>{t(`admin.advertisements.statuses.${query.data?.effectiveStatus ?? query.data?.status}`)}</Text><Text variant="caption">{t("admin.advertisements.statusActionHint")}</Text></YStack> : <YStack gap="$2"><Text variant="label">{t("admin.advertisements.status")}</Text><XStack gap="$2"><Button size="sm" flex={1} variant={status === "draft" ? "primary" : "outline"} onPress={() => setStatus("draft")}>{t("admin.advertisements.statuses.draft")}</Button><Button size="sm" flex={1} variant={status === "active" ? "primary" : "outline"} onPress={() => setStatus("active")}>{t("admin.advertisements.statuses.active")}</Button></XStack></YStack>}
          {error ? <Text color="$danger">{error}</Text> : null}
          <Button fullWidth loading={create.isPending || update.isPending} onPress={save}>{advertisementId ? t("admin.advertisements.saveChanges") : t("admin.advertisements.createButton")}</Button>
        </Card>
      </YStack>
      {picker && Platform.OS === "android" ? <DateTimePicker value={picker.value} mode={picker.mode} display="default" onChange={onPickerChange} /> : null}
      <Modal visible={Boolean(picker && Platform.OS === "ios")} transparent animationType="slide" onRequestClose={() => setPicker(undefined)}>
        <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.35)">
          <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "white", borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
            <YStack padding="$4" gap="$3">
              {picker ? <DateTimePicker value={picker.value} mode={picker.mode} display="spinner" onChange={onPickerChange} /> : null}
              <XStack gap="$2"><Button flex={1} variant="outline" onPress={() => setPicker(undefined)}>{t("datePicker.cancel")}</Button><Button flex={1} onPress={confirmIosPicker}>{t("datePicker.confirm")}</Button></XStack>
            </YStack>
          </SafeAreaView>
        </YStack>
      </Modal>
    </Screen>
  );
}

function DateTimeField({ label, dateText, timeText, onDate, onTime }: { label: string; dateText: string; timeText: string; onDate: () => void; onTime: () => void }) {
  const { t } = useTranslation();
  return <YStack gap="$2"><Text variant="label">{label}</Text><XStack gap="$2"><Pressable onPress={onDate} role="button" aria-label={`${label}: ${t("admin.advertisements.chooseDate")}`} style={{ flex: 1 }}><XStack minHeight={48} borderWidth={1.5} borderColor="$borderColor" borderRadius="$md" paddingHorizontal="$3" alignItems="center"><Text>{dateText}</Text></XStack></Pressable><Pressable onPress={onTime} role="button" aria-label={`${label}: ${t("admin.advertisements.chooseTime")}`} style={{ flex: 1 }}><XStack minHeight={48} borderWidth={1.5} borderColor="$borderColor" borderRadius="$md" paddingHorizontal="$3" alignItems="center"><Text>{timeText}</Text></XStack></Pressable></XStack></YStack>;
}
