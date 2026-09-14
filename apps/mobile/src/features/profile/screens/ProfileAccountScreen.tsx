import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { YStack } from "tamagui";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useDeleteAccount, useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getApiErrorMessage } from "@/lib/apiClient";

export function ProfileAccountScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "BOB";

  const confirmAccountDeletion = () => {
    Alert.alert(t("profile.deactivateTitle"), t("profile.deactivateBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deactivateTitle"),
        style: "destructive",
        onPress: () => deleteAccount.mutate(undefined, {
          onError: (error) => Alert.alert(
            t("profile.deleteErrorTitle"),
            getApiErrorMessage(error, t("profile.deleteError")),
          ),
        }),
      },
    ]);
  };

  return (
    <Screen padded={false} scroll scrollBottomPadding={32}>
      <CustomerHeader title={t("customerHeader.account")} showBack />
      <YStack gap="$4" padding="$4">
        <Card elevated alignItems="center" gap="$3">
          <Avatar uri={user?.photoUrl} name={name} size={90} />
          <Text variant="h3" textAlign="center">{name}</Text>
          <Text muted textAlign="center">{user?.email}</Text>
        </Card>
        <Card gap="$3">
          <Button fullWidth loading={logout.isPending} onPress={() => logout.mutate()}>
            {t("common.logout")}
          </Button>
          <Button
            fullWidth
            variant="destructive"
            loading={deleteAccount.isPending}
            onPress={confirmAccountDeletion}
          >
            {t("profile.deactivateTitle")}
          </Button>
        </Card>
      </YStack>
    </Screen>
  );
}
