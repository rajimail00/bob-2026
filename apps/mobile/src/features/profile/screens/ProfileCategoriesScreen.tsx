import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator } from "react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useCompleteWorkerProfile } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CategoryTile } from "@/features/home/components/CategoryTile";
import { useCategories } from "@/features/home/hooks/useJobs";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import type { ProfileStackParamList } from "@/navigation/types";
import { ProfileBackButton } from "../components/ProfileBackButton";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileCategories">;
const MAX_CATEGORIES = 5;

export function ProfileCategoriesScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const categoriesQuery = useCategories();
  const completeWorkerProfile = useCompleteWorkerProfile();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const initialIds = useMemo(() => {
    const saved = user?.workerProfile?.categories ?? [];
    return (categoriesQuery.data ?? [])
      .filter((category) => saved.includes(category._id) || saved.includes(category.slug))
      .map((category) => category._id);
  }, [categoriesQuery.data, user?.workerProfile?.categories]);
  const [selection, setSelection] = useState<string[] | null>(null);
  const [error, setError] = useState<string>();
  const selectedIds = selection ?? initialIds;

  const toggleCategory = (categoryId: string) => {
    setError(undefined);
    setSelection((currentSelection) => {
      const current = currentSelection ?? initialIds;
      if (current.includes(categoryId)) return current.filter((id) => id !== categoryId);
      if (current.length >= MAX_CATEGORIES) {
        setError(t("profileFlow.categoryLimit", { count: MAX_CATEGORIES }));
        return current;
      }
      return [...current, categoryId];
    });
  };

  const save = async () => {
    if (!selectedIds.length) {
      setError(t("profileFlow.categoryRequired"));
      return;
    }
    setError(undefined);
    try {
      await completeWorkerProfile.mutateAsync({
        categories: selectedIds,
        serviceHours: user?.workerProfile?.serviceHours ?? "standard",
      });
      navigation.goBack();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, t("profileFlow.categorySaveError")));
    }
  };

  return (
    <Screen scroll scrollBottomPadding={32}>
      <YStack gap="$5" paddingTop="$2">
        <XStack alignItems="center">
          <ProfileBackButton onPress={navigation.goBack} />
          <Text variant="h3" flex={1}>{t("profileFlow.categories")}</Text>
        </XStack>

        <Text variant="h3">{t("profileFlow.chooseUpToCategories", { count: MAX_CATEGORIES })}</Text>
        <Text muted>{t("profileFlow.selectedCategories", { selected: selectedIds.length, count: MAX_CATEGORIES })}</Text>

        {categoriesQuery.isLoading ? (
          <ActivityIndicator color="#4F8266" />
        ) : categoriesQuery.isError ? (
          <YStack gap="$3" alignItems="center">
            <Text muted textAlign="center">{t("profileFlow.categoriesLoadError")}</Text>
            <Button variant="outline" onPress={() => void categoriesQuery.refetch()}>{t("common.retry")}</Button>
          </YStack>
        ) : (
          <XStack flexWrap="wrap" gap="$3">
            {(categoriesQuery.data ?? []).map((category) => (
              <CategoryTile
                key={category._id}
                category={category}
                label={category.name[locale] || category.name.en}
                isSelected={selectedIds.includes(category._id)}
                onPress={() => toggleCategory(category._id)}
              />
            ))}
          </XStack>
        )}

        {error ? <Text variant="small" color="$danger">{error}</Text> : null}
        <Button
          fullWidth
          onPress={() => void save()}
          loading={completeWorkerProfile.isPending}
          disabled={categoriesQuery.isLoading || categoriesQuery.isError}
        >
          {t("common.save")}
        </Button>
      </YStack>
    </Screen>
  );
}
