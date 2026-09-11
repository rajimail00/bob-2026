import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";

export function ProfileAccountScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "BOB";

  return (
    <Screen padded={false}>
      <CustomerHeader title={t("customerHeader.account")} showBack />
      <YStack gap="$4" padding="$4">
        <Card elevated alignItems="center" gap="$3">
          <Avatar uri={user?.photoUrl} name={name} size={90} />
          <Text variant="h3" textAlign="center">{name}</Text>
          <Text muted textAlign="center">{user?.email}</Text>
          <Button fullWidth loading={logout.isPending} onPress={() => logout.mutate()}>
            {t("common.logout")}
          </Button>
        </Card>
      </YStack>
    </Screen>
  );
}
