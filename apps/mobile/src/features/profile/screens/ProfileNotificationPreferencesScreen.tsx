import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useUpdateNotificationPreferences } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { EditableNotificationPreference } from "@/features/auth/types/auth.types";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { ProfileStackParamList } from "@/navigation/types";
import { ProfileBackButton } from "../components/ProfileBackButton";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileNotifications">;
const FIELDS: EditableNotificationPreference[] = [
  "newApplicant",
  "newMessage",
  "offers",
  "applicationUpdates",
  "jobStatusChanges",
  "jobEdits",
  "cancellations",
  "completions",
];

export function ProfileNotificationPreferencesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useUpdateNotificationPreferences();
  const [error, setError] = useState<string>();

  return (
    <Screen scroll scrollBottomPadding={32}>
      <YStack gap="$4" paddingTop="$2">
        <XStack alignItems="center">
          <ProfileBackButton onPress={navigation.goBack} />
          <Text variant="h3" flex={1}>{t("notificationPreferences.title")}</Text>
        </XStack>
        <Text muted>{t("notificationPreferences.description")}</Text>
        <Card padding="$0" overflow="hidden">
          {FIELDS.map((field, index) => (
            <XStack
              key={field}
              minHeight={62}
              paddingHorizontal="$4"
              alignItems="center"
              gap="$3"
              borderBottomWidth={index === FIELDS.length - 1 ? 0 : 1}
              borderBottomColor="$borderColor"
            >
              <Text flex={1}>{t(`notificationPreferences.fields.${field}`)}</Text>
              <Switch
                checked={user?.notificationPrefs[field] ?? true}
                onCheckedChange={(checked) => {
                  setError(undefined);
                  updatePreferences.mutate(
                    { [field]: checked },
                    { onError: (updateError) => setError(getApiErrorMessage(updateError, t("notificationPreferences.updateError"))) }
                  );
                }}
                disabled={updatePreferences.isPending}
                backgroundColor={user?.notificationPrefs[field] ?? true ? "$primary" : "$borderColor"}
                role="switch"
                aria-label={t("notificationPreferences.toggleLabel", { preference: t(`notificationPreferences.fields.${field}`) })}
              >
                <Switch.Thumb backgroundColor="white" />
              </Switch>
            </XStack>
          ))}
        </Card>
        {error ? <Text variant="small" color="$danger">{error}</Text> : null}
      </YStack>
    </Screen>
  );
}
