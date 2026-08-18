import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { setAppLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";

const LANGUAGE_LABEL: Record<SupportedLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
};

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const currentLocale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";

  return (
    <Screen scroll>
      <YStack gap="$4" paddingTop="$4">
        <XStack alignItems="center" gap="$3">
          <Avatar uri={user?.photoUrl} name={user?.firstName} size={64} />
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
      </YStack>
    </Screen>
  );
}
