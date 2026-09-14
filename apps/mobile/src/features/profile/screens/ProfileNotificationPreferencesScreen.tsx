import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useUpdateNotificationPreferences } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { EditableNotificationPreference } from "@/features/auth/types/auth.types";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { ProfileStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileNotifications">;
const FIELDS = ["newApplicant", "newMessage"] as const satisfies readonly EditableNotificationPreference[];
type VisiblePreference = (typeof FIELDS)[number];
type PreferenceDraft = Record<VisiblePreference, boolean>;

export function ProfileNotificationPreferencesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useUpdateNotificationPreferences();
  const [draft, setDraft] = useState<PreferenceDraft>({ newApplicant: true, newMessage: true });
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDraft({
      newApplicant: user?.notificationPrefs.newApplicant ?? true,
      newMessage: user?.notificationPrefs.newMessage ?? true,
    });
  }, [user?.notificationPrefs.newApplicant, user?.notificationPrefs.newMessage]);

  const savePreferences = () => {
    setError(undefined);
    updatePreferences.mutate(draft, {
      onSuccess: () => navigation.goBack(),
      onError: (updateError) => setError(
        getApiErrorMessage(updateError, t("notificationPreferences.updateError")),
      ),
    });
  };

  const setPreference = (field: VisiblePreference, enabled: boolean) => {
    setDraft((current) => ({ ...current, [field]: enabled }));
  };

  return (
    <Screen>
      <YStack gap="$5" paddingTop="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <HeaderAction label={t("common.back")} onPress={navigation.goBack} />
          <HeaderAction
            label={t("common.save")}
            onPress={savePreferences}
            disabled={updatePreferences.isPending}
          />
        </XStack>

        <Text variant="h4" textAlign="center">{t("notificationPreferences.pushTitle")}</Text>

        <YStack gap="$3">
          {FIELDS.map((field) => (
            <XStack
              key={field}
              minHeight={58}
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$pill"
              paddingLeft="$4"
              paddingRight="$2"
              alignItems="center"
              gap="$2"
              backgroundColor="$backgroundStrong"
            >
              <Text flex={1} fontWeight="700" fontStyle="italic">
                {t(`notificationPreferences.fields.${field}`)}
              </Text>
              <Choice
                label={t("notificationPreferences.on")}
                selected={draft[field]}
                onPress={() => setPreference(field, true)}
              />
              <Choice
                label={t("notificationPreferences.off")}
                selected={!draft[field]}
                onPress={() => setPreference(field, false)}
              />
            </XStack>
          ))}
        </YStack>

        {error ? <Text variant="small" color="$danger" textAlign="center">{error}</Text> : null}
      </YStack>
    </Screen>
  );
}

function HeaderAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ minWidth: 84, minHeight: 48, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}
    >
      <Text color="$primary" fontWeight="600">{label}</Text>
    </Pressable>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Text color={selected ? "$primary" : "$colorMuted"} fontWeight={selected ? "700" : "500"}>
        {label}
      </Text>
    </Pressable>
  );
}
