import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, Pressable, Share } from "react-native";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import { LANGUAGE_OPTIONS, type SupportedLocale } from "@/lib/i18n";
import {
  useCompleteWorkerProfile,
  useDeleteAccount,
  useLogout,
  useUpdateLocale,
} from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { ProfileStackParamList } from "@/navigation/types";
import { ProfileBackButton } from "../components/ProfileBackButton";
import { ProfilePortrait } from "../components/ProfilePortrait";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileSettings">;
type IconName = keyof typeof Ionicons.glyphMap;
const SUPPORT_EMAIL = "support@bob-app.com";

export function ProfileSettingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const updateLocale = useUpdateLocale();
  const updateWorkerProfile = useCompleteWorkerProfile();
  const currentLocale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLocale>(user?.locale ?? currentLocale);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageError, setLanguageError] = useState<string>();

  useEffect(() => {
    if (user?.locale) setSelectedLanguage(user.locale);
  }, [user?.locale]);

  const selectedLanguageDetails = LANGUAGE_OPTIONS.find((language) => language.code === selectedLanguage);

  const changeLanguage = async (locale: SupportedLocale) => {
    if (updateLocale.isPending || locale === user?.locale) {
      setLanguageOpen(false);
      return;
    }
    setLanguageError(undefined);
    try {
      const updatedUser = await updateLocale.mutateAsync(locale);
      setSelectedLanguage(updatedUser.locale);
      setLanguageOpen(false);
    } catch (error) {
      setLanguageError(getApiErrorMessage(error, t("language.updateError")));
    }
  };

  const toggleServiceHours = async () => {
    const workerProfile = user?.workerProfile;
    if (!workerProfile?.categories.length) {
      navigation.navigate("ProfileCategories");
      return;
    }
    try {
      await updateWorkerProfile.mutateAsync({
        categories: workerProfile.categories,
        serviceHours: workerProfile.serviceHours === "24h" ? "standard" : "24h",
      });
    } catch (error) {
      Alert.alert(t("profileFlow.serviceHours"), getApiErrorMessage(error, t("profileFlow.availabilityUpdateError")));
    }
  };

  const inviteFriends = async () => {
    try {
      await Share.share({ message: t("profileFlow.inviteMessage") });
    } catch {
      Alert.alert(t("profile.invite"), t("profileFlow.actionUnavailable"));
    }
  };

  const openEmail = async (subject: string) => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
    Alert.alert(t("profileFlow.contactUnavailableTitle"), t("profileFlow.contactUnavailableBody"));
  };

  const confirmAccountDeletion = () => {
    Alert.alert(t("profile.deactivateTitle"), t("profile.deactivateBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deactivateTitle"),
        style: "destructive",
        onPress: () => deleteAccount.mutate(undefined, {
          onError: (error) => Alert.alert(t("profile.deleteErrorTitle"), getApiErrorMessage(error, t("profile.deleteError"))),
        }),
      },
    ]);
  };

  return (
    <Screen scroll scrollBottomPadding={32}>
      <YStack gap="$4" paddingTop="$2">
        <XStack alignItems="center">
          <ProfileBackButton onPress={navigation.goBack} />
          <Text variant="h3" flex={1}>{t("profileFlow.settings")}</Text>
        </XStack>

        <YStack alignItems="center" gap="$2">
          <ProfilePortrait uri={user?.photoUrl} name={user?.firstName} size={96} />
          <Text variant="h4">{user?.firstName} {user?.lastName}</Text>
          <Pressable
            onPress={() => navigation.navigate("ProfileEdit")}
            role="button"
            aria-label={t("profile.edit")}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <YStack width={36} height={36} borderRadius={18} backgroundColor="$primary" alignItems="center" justifyContent="center">
              <Ionicons name="pencil" size={18} color="white" />
            </YStack>
          </Pressable>
        </YStack>

        <YStack height={1} backgroundColor="$borderColor" />

        <YStack gap="$3">
          <SettingsPair>
            <SettingsAction icon="grid" label={t("profileFlow.chooseCategories")} onPress={() => navigation.navigate("ProfileCategories")} />
            <SettingsAction
              icon="time-outline"
              label={t("profileFlow.serviceHours")}
              value={t(user?.workerProfile?.serviceHours === "24h" ? "workerProfile.allDay" : "workerProfile.standard")}
              loading={updateWorkerProfile.isPending}
              onPress={() => void toggleServiceHours()}
            />
          </SettingsPair>

          <SettingsPair>
            <SettingsAction icon="notifications-outline" label={t("notificationPreferences.shortTitle")} onPress={() => navigation.navigate("ProfileNotifications")} />
            <SettingsAction icon="share-social-outline" label={t("profile.invite")} onPress={() => void inviteFriends()} />
          </SettingsPair>

          <SettingsPair>
            <SettingsAction icon="heart-outline" label={t("profile.feedback")} onPress={() => void openEmail(t("profileFlow.feedbackSubject"))} />
            <SettingsAction icon="help-circle-outline" label={t("profile.help")} onPress={() => void openEmail(t("profileFlow.helpSubject"))} />
          </SettingsPair>
        </YStack>

        <YStack gap="$2">
          <Pressable
            onPress={() => setLanguageOpen((open) => !open)}
            role="button"
            aria-label={t("language.select")}
          >
            <XStack minHeight={54} borderWidth={1} borderColor="$borderColor" borderRadius="$pill" paddingHorizontal="$4" alignItems="center" justifyContent="space-between" backgroundColor="$backgroundStrong">
              <Text>{selectedLanguageDetails?.label ?? t("language.select")}</Text>
              <Ionicons name={languageOpen ? "chevron-up" : "chevron-down"} size={18} color="#5B6358" />
            </XStack>
          </Pressable>
          {languageOpen ? (
            <Card padding="$0" overflow="hidden">
              {LANGUAGE_OPTIONS.map((language, index) => (
                <Pressable
                  key={language.code}
                  onPress={() => void changeLanguage(language.code)}
                  role="button"
                  aria-label={t("language.selectOption", { language: language.label })}
                  disabled={updateLocale.isPending}
                >
                  <XStack minHeight={48} paddingHorizontal="$4" alignItems="center" gap="$3" borderBottomWidth={index === LANGUAGE_OPTIONS.length - 1 ? 0 : 1} borderBottomColor="$borderColor">
                    <Text fontSize={22}>{language.flag}</Text>
                    <Text flex={1}>{language.label}</Text>
                    {selectedLanguage === language.code ? <Ionicons name="checkmark" size={20} color="#4F8266" /> : null}
                  </XStack>
                </Pressable>
              ))}
            </Card>
          ) : null}
          {languageError ? <Text variant="small" color="$danger">{languageError}</Text> : null}
        </YStack>

        <Button
          fullWidth
          onPress={() => Alert.alert(t("profileFlow.upgradePro"), t("profileFlow.actionUnavailable"))}
        >
          {t("profileFlow.upgradePro")}
        </Button>

        <Card gap="$3">
          <XStack justifyContent="space-between">
            <Text variant="label">{t("profile.subscription")}</Text>
            <Text fontWeight="600">BOB-{t(`subscriptionTiers.${user?.subscriptionTier ?? "free"}`)}</Text>
          </XStack>
          <Button variant="outline" onPress={() => logout.mutate()} loading={logout.isPending}>{t("common.logout")}</Button>
          <Button variant="destructive" onPress={confirmAccountDeletion} loading={deleteAccount.isPending}>{t("profile.deactivateTitle")}</Button>
        </Card>
      </YStack>
    </Screen>
  );
}

function SettingsPair({ children }: { children: ReactNode }) {
  return (
    <XStack minHeight={64} borderWidth={1} borderColor="$borderColor" borderRadius="$pill" overflow="hidden" backgroundColor="$backgroundStrong">
      {children}
    </XStack>
  );
}

function SettingsAction({ icon, label, value, loading, onPress }: { icon: IconName; label: string; value?: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading} role="button" aria-label={value ? `${label}: ${value}` : label} style={{ flex: 1 }}>
      <XStack flex={1} minHeight={62} paddingHorizontal="$3" gap="$2" alignItems="center" justifyContent="center" borderRightWidth={1} borderRightColor="$borderColor" opacity={loading ? 0.5 : 1}>
        <Ionicons name={icon} size={18} color="#4F8266" />
        <YStack flexShrink={1}>
          <Text variant="small" fontWeight="600" textAlign="center" numberOfLines={2}>{label}</Text>
          {value ? <Text variant="caption" textAlign="center">{value}</Text> : null}
        </YStack>
      </XStack>
    </Pressable>
  );
}
