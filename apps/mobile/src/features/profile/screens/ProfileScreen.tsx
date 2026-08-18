import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useDeleteAccount, useLogout, } from "@/features/auth/hooks/useAuthMutations";
import { setAppLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/apiClient";

const LANGUAGE_LABEL: Record<SupportedLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
};

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const currentLocale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const confirmAccountDeletion = () => {
    Alert.alert(
      "Deactivate account",
      "This will permanently delete your account. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onError: (error) => {
                Alert.alert(
                  "Unable to delete account",
                  getApiErrorMessage(
                    error,
                    "Your account could not be deleted. Please try again."
                  )
                );
              },
            });
          },
        },
      ]
    );
  };

  return (
    <Screen scroll>
      <YStack gap="$4" paddingTop="$4">
        <XStack alignItems="center" gap="$3">
          <YStack width={64} height={64} borderRadius={32} backgroundColor="$brand100" alignItems="center" justifyContent="center">
            <Text variant="h3" color="$brand700">
              {user?.firstName?.[0] ?? "?"}
            </Text>
          </YStack>
          <YStack>
            <Text variant="h4">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text variant="body" muted>
              {user?.email}
            </Text>
          </YStack>
        </XStack>

        <Card>
          <Text variant="label">Rating</Text>
          <Text variant="h3">
            {(user?.rating.average ?? 0).toFixed(1)} / 5 · {user?.rating.count ?? 0} reviews
          </Text>
        </Card>

        <Card>
          <Text variant="label">Subscription</Text>
          <Text variant="h4" textTransform="capitalize">
            BOB-{user?.subscriptionTier ?? "free"}
          </Text>
        </Card>

        <YStack gap="$2">
          <Text variant="label">Language</Text>
          <PillTabs
            options={SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_LABEL[locale] }))}
            value={currentLocale}
            onChange={(locale) => setAppLocale(locale)}
          />
        </YStack>

        <Button variant="outline" onPress={() => logout.mutate()} loading={logout.isPending}>
          {t("common.logout")}
        </Button>
        <Button
          variant="destructive"
          onPress={confirmAccountDeletion}
          loading={deleteAccount.isPending}
        >
          Deactivate account
        </Button>
      </YStack>
    </Screen>
  );
}
