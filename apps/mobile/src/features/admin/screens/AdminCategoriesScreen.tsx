import { Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminHeader } from "../components/AdminHeader";
import { adminApi } from "../api/admin.api";
import { useAdminCategories, useCreateAdminCategory, useDeleteAdminCategory, useUpdateAdminCategory } from "../hooks/useAdmin";
import type { Category, LocalizedText } from "../types/admin.types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "../hooks/useAdmin";

const emptyNames = (): LocalizedText => ({ en: "", de: "", es: "", fr: "" });
export function AdminCategoriesScreen() {
  const { t, i18n } = useTranslation(); const query = useAdminCategories(); const create = useCreateAdminCategory(); const update = useUpdateAdminCategory(); const remove = useDeleteAdminCategory(); const client = useQueryClient();
  const [editing, setEditing] = useState<Category>(); const [slug, setSlug] = useState(""); const [icon, setIcon] = useState("briefcase-outline"); const [names, setNames] = useState<LocalizedText>(emptyNames()); const [search, setSearch] = useState("");
  const reset = () => { setEditing(undefined); setSlug(""); setIcon("briefcase-outline"); setNames(emptyNames()); };
  const choose = (category: Category) => { setEditing(category); setSlug(category.slug); setIcon(category.icon); setNames(category.name); };
  const valid = slug.trim() && icon.trim() && Object.values(names).every((value) => value.trim());
  const save = () => { const input = { slug: slug.trim(), icon: icon.trim(), name: names, order: editing?.order ?? (query.data?.length ?? 0) }; if (editing) update.mutate({ id: editing._id, ...input }, { onSuccess: reset }); else create.mutate(input, { onSuccess: reset }); };
  const move = async (index: number, direction: -1 | 1) => { if (!query.data) return; const target = index + direction; if (target < 0 || target >= query.data.length) return; const reordered = [...query.data]; [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]; await adminApi.reorderCategories(reordered.map((item, order) => ({ id: item._id, order }))); await client.invalidateQueries({ queryKey: adminKeys.categories }); };
  return <Screen scroll padded={false}><AdminHeader title={t("admin.settings.categories")} showBack /><YStack padding="$4" gap="$4"><Card elevated><Text variant="h4">{editing ? t("admin.categories.edit") : t("admin.categories.add")}</Text><Input label={t("admin.categories.slug")} value={slug} onChangeText={setSlug} autoCapitalize="none" /><Input label={t("admin.categories.icon")} value={icon} onChangeText={setIcon} />{(["en", "de", "es", "fr"] as const).map((locale) => <Input key={locale} label={t("admin.categories.name", { language: locale.toUpperCase() })} value={names[locale]} onChangeText={(value) => setNames((current) => ({ ...current, [locale]: value }))} />)}<XStack gap="$2"><Button flex={1} disabled={!valid} loading={create.isPending || update.isPending} onPress={save}>{t("common.save")}</Button>{editing ? <Button flex={1} variant="outline" onPress={reset}>{t("common.cancel")}</Button> : null}</XStack></Card><Input placeholder={t("admin.common.search")} aria-label={t("admin.categories.searchLabel")} value={search} onChangeText={setSearch} />{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : <YStack gap="$3"><Text variant="h4">{t("admin.categories.existing")}</Text>{query.data?.filter((item) => Object.values(item.name).some((name) => name.toLowerCase().includes(search.toLowerCase()))).map((item, index) => <Card key={item._id} elevated><XStack alignItems="center" gap="$3"><YStack width={48} height={48} borderRadius="$md" backgroundColor="$brand100" alignItems="center" justifyContent="center"><Ionicons name={(Ionicons.glyphMap[item.icon as keyof typeof Ionicons.glyphMap] ? item.icon : "briefcase-outline") as keyof typeof Ionicons.glyphMap} size={24} color="#4F8266" /></YStack><YStack flex={1}><Text variant="h4">{item.name[i18n.language as keyof LocalizedText] || item.name.en}</Text><Text variant="caption">{item.slug}</Text></YStack><Pressable onPress={() => move(index, -1)} role="button" aria-label={t("admin.categories.moveUp")}><Ionicons name="arrow-up" size={22} color="#4F8266" /></Pressable><Pressable onPress={() => move(index, 1)} role="button" aria-label={t("admin.categories.moveDown")}><Ionicons name="arrow-down" size={22} color="#4F8266" /></Pressable><Pressable onPress={() => choose(item)} role="button" aria-label={t("admin.categories.edit")}><Ionicons name="create-outline" size={22} color="#4F8266" /></Pressable><Pressable onPress={() => Alert.alert(t("admin.categories.deleteTitle"), item.name.en, [{ text: t("common.cancel"), style: "cancel" }, { text: t("admin.categories.delete"), style: "destructive", onPress: () => remove.mutate(item._id) }])} role="button" aria-label={t("admin.categories.delete")}><Ionicons name="trash-outline" size={22} color="#C1554B" /></Pressable></XStack></Card>)}</YStack>}</YStack></Screen>;
}
