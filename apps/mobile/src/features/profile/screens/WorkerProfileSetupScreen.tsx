import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { CategoryTile } from "@/features/home/components/CategoryTile";
import { useCategories } from "@/features/home/hooks/useJobs";
import { useCompleteWorkerProfile } from "@/features/auth/hooks/useAuthMutations";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";

const MAX_CATEGORIES = 5;

/** The "Wähle bis zu 5 Kategorien" gate — completing this unlocks applying to / accepting jobs. */
export function WorkerProfileSetupScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const categoriesQuery = useCategories();
  const completeWorkerProfile = useCompleteWorkerProfile();

  const [selected, setSelected] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState<"standard" | "24h">("standard");
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      if (current.length >= MAX_CATEGORIES) return current;
      return [...current, id];
    });
  };

  const onSubmit = async () => {
    setError(null);
    try {
      await completeWorkerProfile.mutateAsync({ categories: selected, serviceHours });
      navigation.goBack();
    } catch (err) {
      setError(getApiErrorMessage(err, t("common.genericError")));
    }
  };

  if (categoriesQuery.isLoading) return <LoadingState label={t("common.loading")} />;
  if (categoriesQuery.isError || !categoriesQuery.data) {
    return (
      <ErrorState
        title={t("common.genericError")}
        retryLabel={t("common.retry")}
        onRetry={() => categoriesQuery.refetch()}
      />
    );
  }

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$4">
        <Text variant="h3">{t("workerProfile.chooseCategories", { count: MAX_CATEGORIES })}</Text>

        <XStack flexWrap="wrap" gap="$2">
          {categoriesQuery.data.map((category) => (
            <CategoryTile
              key={category._id}
              category={category}
              label={category.name[locale] ?? category.name.en}
              isSelected={selected.includes(category._id)}
              onPress={() => toggleCategory(category._id)}
            />
          ))}
        </XStack>

        <YStack gap="$2">
          <Text variant="label">{t("workerProfile.availability")}</Text>
          <PillTabs
            options={[
              { value: "standard", label: t("workerProfile.standard") },
              { value: "24h", label: t("workerProfile.allDay") },
            ]}
            value={serviceHours}
            onChange={setServiceHours}
          />
        </YStack>

        {error ? (
          <Text variant="small" color="$danger">
            {error}
          </Text>
        ) : null}

        <Button
          onPress={onSubmit}
          loading={completeWorkerProfile.isPending}
          disabled={selected.length === 0}
          fullWidth
        >
          {t("common.save")}
        </Button>
      </YStack>
    </Screen>
  );
}
