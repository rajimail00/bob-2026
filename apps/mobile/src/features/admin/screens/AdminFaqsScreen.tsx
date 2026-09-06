import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, Switch } from "react-native";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { adminApi } from "../api/admin.api";
import { AdminHeader } from "../components/AdminHeader";
import {
  adminKeys,
  useAdminFaqs,
  useCreateAdminFaq,
  useDeleteAdminFaq,
  useUpdateAdminFaq,
} from "../hooks/useAdmin";
import type { Faq, LocalizedText } from "../types/admin.types";

const locales = ["en", "de", "es", "fr"] as const;
const blank = (): LocalizedText => ({ en: "", de: "", es: "", fr: "" });

export function AdminFaqsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const query = useAdminFaqs();
  const create = useCreateAdminFaq();
  const update = useUpdateAdminFaq();
  const remove = useDeleteAdminFaq();
  const [editing, setEditing] = useState<Faq>();
  const [question, setQuestion] = useState<LocalizedText>(blank());
  const [answer, setAnswer] = useState<LocalizedText>(blank());
  const [section, setSection] = useState("general");
  const [published, setPublished] = useState(false);
  const [search, setSearch] = useState("");

  const reset = () => {
    setEditing(undefined);
    setQuestion(blank());
    setAnswer(blank());
    setSection("general");
    setPublished(false);
  };

  const choose = (faq: Faq) => {
    setEditing(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setSection(faq.section);
    setPublished(faq.published);
  };

  const valid = Boolean(
    section.trim()
      && Object.values(question).every((value) => value.trim())
      && Object.values(answer).every((value) => value.trim())
  );

  const save = () => {
    const input = {
      question,
      answer,
      section: section.trim(),
      published,
      order: editing?.order ?? (query.data?.items.length ?? 0),
    };
    if (editing) update.mutate({ id: editing._id, ...input }, { onSuccess: reset });
    else create.mutate(input, { onSuccess: reset });
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!query.data) return;
    const target = index + direction;
    if (target < 0 || target >= query.data.items.length) return;
    const reordered = [...query.data.items];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    await adminApi.reorderFaqs(reordered.map((item, order) => ({ id: item._id, order })));
    await queryClient.invalidateQueries({ queryKey: adminKeys.faqs });
  };

  const visibleItems = (query.data?.items ?? []).filter((item) => {
    const value = search.trim().toLowerCase();
    return !value
      || item.section.toLowerCase().includes(value)
      || Object.values(item.question).some((text) => text.toLowerCase().includes(value));
  });

  return (
    <Screen scroll padded={false}>
      <AdminHeader title={t("admin.settings.faqs")} showBack />
      <YStack padding="$4" gap="$4">
        <Card elevated>
          <Text variant="h4">{editing ? t("admin.faqs.edit") : t("admin.faqs.add")}</Text>
          <Input label={t("admin.faqs.section")} value={section} onChangeText={setSection} />
          {locales.map((locale) => (
            <YStack key={locale} gap="$2">
              <Input label={t("admin.faqs.question", { language: locale.toUpperCase() })} value={question[locale]} onChangeText={(value) => setQuestion((current) => ({ ...current, [locale]: value }))} />
              <Input label={t("admin.faqs.answer", { language: locale.toUpperCase() })} value={answer[locale]} onChangeText={(value) => setAnswer((current) => ({ ...current, [locale]: value }))} multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
            </YStack>
          ))}
          <XStack alignItems="center" justifyContent="space-between">
            <Text>{t("admin.faqs.published")}</Text>
            <Switch value={published} onValueChange={setPublished} aria-label={t("admin.faqs.published")} />
          </XStack>
          <XStack gap="$2">
            <Button flex={1} disabled={!valid} loading={create.isPending || update.isPending} onPress={save}>{t("common.save")}</Button>
            {editing ? <Button flex={1} variant="outline" onPress={reset}>{t("common.cancel")}</Button> : null}
          </XStack>
        </Card>

        <Input placeholder={t("admin.common.search")} aria-label={t("admin.common.searchLabel")} value={search} onChangeText={setSearch} />
        <Text variant="h4">{t("admin.faqs.existing")}</Text>
        {query.isLoading ? <LoadingState /> : query.isError ? (
          <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} />
        ) : visibleItems.length ? visibleItems.map((item) => {
          const sourceIndex = query.data?.items.findIndex((faq) => faq._id === item._id) ?? 0;
          return (
            <Card key={item._id} elevated>
              <XStack gap="$3" alignItems="center">
                <YStack flex={1}>
                  <Text variant="h4">{item.question[i18n.language as keyof LocalizedText] || item.question.en}</Text>
                  <Text variant="caption">{item.section} · {item.published ? t("admin.faqs.published") : t("admin.faqs.unpublished")}</Text>
                </YStack>
                <Pressable onPress={() => move(sourceIndex, -1)} role="button" aria-label={t("admin.categories.moveUp")}><Ionicons name="arrow-up" size={22} color="#4F8266" /></Pressable>
                <Pressable onPress={() => move(sourceIndex, 1)} role="button" aria-label={t("admin.categories.moveDown")}><Ionicons name="arrow-down" size={22} color="#4F8266" /></Pressable>
                <Pressable onPress={() => choose(item)} role="button" aria-label={t("admin.faqs.edit")}><Ionicons name="create-outline" size={23} color="#4F8266" /></Pressable>
                <Pressable onPress={() => Alert.alert(t("admin.faqs.deleteTitle"), item.question.en, [{ text: t("common.cancel"), style: "cancel" }, { text: t("admin.faqs.delete"), style: "destructive", onPress: () => remove.mutate(item._id) }])} role="button" aria-label={t("admin.faqs.delete")}><Ionicons name="trash-outline" size={23} color="#C1554B" /></Pressable>
              </XStack>
            </Card>
          );
        }) : <Text muted>{t("admin.common.noData")}</Text>}
      </YStack>
    </Screen>
  );
}
