import { useState } from "react";
import { Alert, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { adminApi } from "../api/admin.api";
import { AdminHeader } from "../components/AdminHeader";
import { CategoryImagePicker } from "../components/CategoryImagePicker";
import {
  adminKeys,
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from "../hooks/useAdmin";
import type { Category, LocalizedText } from "../types/admin.types";

const emptyNames = (): LocalizedText => ({ en: "", de: "", es: "", fr: "" });
const localeCodes = ["en", "de", "es", "fr"] as const;

export function AdminCategoriesScreen() {
  const { t, i18n } = useTranslation();
  const query = useAdminCategories();
  const create = useCreateAdminCategory();
  const update = useUpdateAdminCategory();
  const remove = useDeleteAdminCategory();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Category>();
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("briefcase-outline");
  const [imageUrl, setImageUrl] = useState<string>();
  const [names, setNames] = useState<LocalizedText>(emptyNames());
  const [search, setSearch] = useState("");

  const reset = () => {
    setEditing(undefined);
    setSlug("");
    setIcon("briefcase-outline");
    setImageUrl(undefined);
    setNames(emptyNames());
  };

  const choose = (category: Category) => {
    setEditing(category);
    setSlug(category.slug);
    setIcon(category.icon);
    setImageUrl(category.imageUrl ?? undefined);
    setNames(category.name);
  };

  const valid = Boolean(slug.trim() && icon.trim() && Object.values(names).every((value) => value.trim()));
  const save = () => {
    const input = {
      slug: slug.trim(),
      icon: icon.trim(),
      imageUrl: imageUrl ?? null,
      name: names,
      order: editing?.order ?? (query.data?.length ?? 0),
    };
    if (editing) update.mutate({ id: editing._id, ...input }, { onSuccess: reset });
    else create.mutate(input, { onSuccess: reset });
  };

  const move = async (category: Category, direction: -1 | 1) => {
    if (!query.data) return;
    const index = query.data.findIndex((item) => item._id === category._id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= query.data.length) return;
    const reordered = [...query.data];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    await adminApi.reorderCategories(reordered.map((item, order) => ({ id: item._id, order })));
    await client.invalidateQueries({ queryKey: adminKeys.categories });
  };

  const confirmDelete = (category: Category) => {
    Alert.alert(t("admin.categories.deleteTitle"), category.name.en, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("admin.categories.delete"),
        style: "destructive",
        onPress: () => remove.mutate(category._id, { onSuccess: editing?._id === category._id ? reset : undefined }),
      },
    ]);
  };

  const currentLocale = i18n.language as keyof LocalizedText;
  const filteredCategories = query.data?.filter((item) =>
    Object.values(item.name).some((name) => name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  return (
    <Screen scroll padded={false} scrollBottomPadding={24}>
      <AdminHeader title={t("admin.settings.categories")} showBack />
      <YStack padding="$4" gap="$4">
        <Text muted>{t("admin.categories.description")}</Text>

        <Card elevated gap="$4">
          <Text variant="h4">{editing ? t("admin.categories.edit") : t("admin.categories.add")}</Text>
          <CategoryImagePicker imageUrl={imageUrl} onChange={setImageUrl} />
          <Input
            label={t("admin.categories.shortName")}
            placeholder={t("admin.categories.shortNamePlaceholder")}
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {localeCodes.map((locale) => (
            <Input
              key={locale}
              label={t("admin.categories.name", { language: locale.toUpperCase() })}
              value={names[locale]}
              onChangeText={(value) => setNames((current) => ({ ...current, [locale]: value }))}
            />
          ))}
          <Button fullWidth disabled={!valid} loading={create.isPending || update.isPending} onPress={save}>
            {editing ? t("admin.categories.saveChanges") : t("common.save")}
          </Button>
          {editing ? (
            <>
              <XStack justifyContent="center" gap="$3">
                <Pressable onPress={() => move(editing, -1)} role="button" aria-label={t("admin.categories.moveUp")} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#4F8266", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="arrow-up" size={22} color="#4F8266" />
                </Pressable>
                <Pressable onPress={() => move(editing, 1)} role="button" aria-label={t("admin.categories.moveDown")} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#4F8266", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="arrow-down" size={22} color="#4F8266" />
                </Pressable>
              </XStack>
              <XStack gap="$2">
                <Button flex={1} variant="outline" onPress={reset}>{t("common.cancel")}</Button>
                <Button flex={1} variant="destructive" onPress={() => confirmDelete(editing)}>{t("admin.categories.delete")}</Button>
              </XStack>
            </>
          ) : null}
        </Card>

        <Input
          placeholder={t("admin.common.search")}
          aria-label={t("admin.categories.searchLabel")}
          value={search}
          onChangeText={setSearch}
        />

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} />
        ) : (
          <YStack gap="$3">
            <Text variant="h4">{t("admin.categories.existing")}</Text>
            <XStack flexWrap="wrap" justifyContent="space-between" gap="$3">
              {filteredCategories?.map((item) => (
                <Card key={item._id} elevated width="47.5%" padding="$3" gap="$2">
                  <Pressable onPress={() => choose(item)} role="button" aria-label={t("admin.categories.editCategory", { name: item.name[currentLocale] || item.name.en })}>
                    <YStack alignItems="center" gap="$2">
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={{ width: "100%", height: 88, borderRadius: 12 }} />
                      ) : (
                        <YStack width="100%" height={88} borderRadius="$md" backgroundColor="$brand100" alignItems="center" justifyContent="center">
                          <Ionicons name={(Ionicons.glyphMap[item.icon as keyof typeof Ionicons.glyphMap] ? item.icon : "briefcase-outline") as keyof typeof Ionicons.glyphMap} size={34} color="#4F8266" />
                        </YStack>
                      )}
                      <Text color="$primary" fontWeight="600" textAlign="center" numberOfLines={2}>
                        {item.name[currentLocale] || item.name.en}
                      </Text>
                    </YStack>
                  </Pressable>
                  <XStack justifyContent="space-around" borderTopWidth={1} borderColor="$borderColor" paddingTop="$2">
                    <Pressable onPress={() => choose(item)} role="button" aria-label={t("admin.categories.edit")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="create-outline" size={22} color="#4F8266" />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(item)} role="button" aria-label={t("admin.categories.delete")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="trash-outline" size={22} color="#C1554B" />
                    </Pressable>
                  </XStack>
                </Card>
              ))}
            </XStack>
          </YStack>
        )}
      </YStack>
    </Screen>
  );
}
