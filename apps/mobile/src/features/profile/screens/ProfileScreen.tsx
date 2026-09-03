import { ActivityIndicator, Alert, Image, Pressable, type TextInput as RNTextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Input as TamaguiInput, Switch, XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useKeyboardScroll } from "@/components/ui/KeyboardScrollContext";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  useCompleteProfile,
  useDeleteAccount,
  useLogout,
  useUpdateLocale,
  useUpdateNotificationPreferences,
} from "@/features/auth/hooks/useAuthMutations";
import type { EditableNotificationPreference } from "@/features/auth/types/auth.types";
import { LANGUAGE_OPTIONS, type SupportedLocale } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadMedia } from "@/features/media/api/media.api";

const PHONE_COUNTRIES = [
  { iso: "DE", flag: "🇩🇪", dialCode: "+49" },
  { iso: "US", flag: "🇺🇸", dialCode: "+1" },
  { iso: "GB", flag: "🇬🇧", dialCode: "+44" },
  { iso: "FR", flag: "🇫🇷", dialCode: "+33" },
  { iso: "ES", flag: "🇪🇸", dialCode: "+34" },
  { iso: "IN", flag: "🇮🇳", dialCode: "+91" },
  { iso: "IT", flag: "🇮🇹", dialCode: "+39" },
  { iso: "NL", flag: "🇳🇱", dialCode: "+31" },
  { iso: "AT", flag: "🇦🇹", dialCode: "+43" },
  { iso: "CH", flag: "🇨🇭", dialCode: "+41" },
] as const;

type PhoneCountryIso = (typeof PHONE_COUNTRIES)[number]["iso"];

const PHONE_COUNTRY_BY_LOCALE: Partial<Record<SupportedLocale, PhoneCountryIso>> = {
  de: "DE",
  en: "US",
  fr: "FR",
  es: "ES",
};

function getPhoneCountry(phone: string | undefined, locale: SupportedLocale) {
  const byPhone = PHONE_COUNTRIES.find((country) => phone?.trim().startsWith(country.dialCode));
  const byLocale = PHONE_COUNTRIES.find((country) => country.iso === PHONE_COUNTRY_BY_LOCALE[locale]);
  return byPhone ?? byLocale ?? PHONE_COUNTRIES[0];
}

function stripDialCode(phone: string | undefined, country: (typeof PHONE_COUNTRIES)[number]) {
  const trimmedPhone = phone?.trim() ?? "";

  if (trimmedPhone.startsWith(country.dialCode)) {
    return trimmedPhone.slice(country.dialCode.length).trim();
  }

  return trimmedPhone;
}

interface ProfilePillInputProps {
  value: string;
  editable?: boolean;
  placeholder?: string;
  leftText?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  accessibilityLabel: string;
  onChangeText?: (value: string) => void;
}

function ProfilePillInput({
  value,
  editable = false,
  placeholder,
  leftText,
  keyboardType = "default",
  accessibilityLabel,
  onChangeText,
}: ProfilePillInputProps) {
  const inputRef = useRef<RNTextInput>(null);
  const scrollFocusedInput = useKeyboardScroll();

  return (
    <XStack
      height={44}
      borderWidth={1.1}
      borderColor="#232920"
      borderRadius={22}
      backgroundColor="white"
      alignItems="center"
      overflow="hidden"
      opacity={editable ? 1 : 0.9}
    >
      {leftText ? (
        <Text fontSize={18} marginLeft="$4">
          {leftText}
        </Text>
      ) : null}
      <TamaguiInput
        ref={inputRef}
        flex={1}
        height={42}
        borderWidth={0}
        backgroundColor="transparent"
        color="#232920"
        editable={editable}
        fontSize={13}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onFocus={() => scrollFocusedInput(inputRef.current)}
        paddingHorizontal="$3"
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        textAlign="center"
        value={value}
        accessibilityLabel={accessibilityLabel}
      />
    </XStack>
  );
}

interface PhoneNumberInputProps {
  country: (typeof PHONE_COUNTRIES)[number];
  isCountryOpen: boolean;
  value: string;
  onCountryPress: () => void;
  onCountryChange: (country: (typeof PHONE_COUNTRIES)[number]) => void;
  onChangeText: (value: string) => void;
}

function PhoneNumberInput({
  country,
  isCountryOpen,
  value,
  onCountryPress,
  onCountryChange,
  onChangeText,
}: PhoneNumberInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<RNTextInput>(null);
  const scrollFocusedInput = useKeyboardScroll();

  return (
    <YStack gap="$2">
      <XStack
        height={44}
        borderWidth={1.1}
        borderColor="#232920"
        borderRadius={22}
        backgroundColor="white"
        alignItems="center"
        overflow="hidden"
      >
        <XStack
          height={44}
          minWidth={96}
          alignItems="center"
          justifyContent="center"
          gap="$1"
          onPress={onCountryPress}
          accessibilityRole="button"
          accessibilityLabel={t("profile.phoneCountry")}
        >
          <Text fontSize={18}>{country.flag}</Text>
          <Text fontSize={13}>{country.dialCode}</Text>
          <Ionicons name={isCountryOpen ? "chevron-up" : "chevron-down"} size={14} color="#232920" />
        </XStack>

        <YStack width={1} height={24} backgroundColor="#CBD2C4" />

        <TamaguiInput
          ref={inputRef}
          flex={1}
          height={42}
          borderWidth={0}
          backgroundColor="transparent"
          color="#232920"
          editable
          fontSize={13}
          keyboardType="phone-pad"
          onChangeText={onChangeText}
          onFocus={() => scrollFocusedInput(inputRef.current)}
          paddingHorizontal="$3"
          placeholder={t("profile.phonePlaceholder")}
          placeholderTextColor="#6B7280"
          value={value}
          accessibilityLabel={t("profile.phoneLabel")}
        />
      </XStack>

      {isCountryOpen ? (
        <YStack
          borderWidth={1.1}
          borderColor="#232920"
          borderRadius={16}
          backgroundColor="white"
          overflow="hidden"
        >
          {PHONE_COUNTRIES.map((phoneCountry) => (
            <XStack
              key={phoneCountry.iso}
              height={44}
              paddingHorizontal="$4"
              alignItems="center"
              gap="$2"
              borderBottomWidth={phoneCountry.iso === PHONE_COUNTRIES[PHONE_COUNTRIES.length - 1].iso ? 0 : 1}
              borderBottomColor="#E5E7EB"
              onPress={() => onCountryChange(phoneCountry)}
              accessibilityRole="button"
              accessibilityLabel={t("profile.useCountry", {
                country: t(`countries.${phoneCountry.iso}`),
                dialCode: phoneCountry.dialCode,
              })}
            >
              <Text fontSize={18}>{phoneCountry.flag}</Text>
              <Text flex={1} fontSize={13}>
                {t(`countries.${phoneCountry.iso}`)}
              </Text>
              <Text fontSize={13} color="#4A4A4A">
                {phoneCountry.dialCode}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const completeProfile = useCompleteProfile();
  const updateLocale = useUpdateLocale();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const currentLocale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const [showSettings, setShowSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationPreferenceError, setNotificationPreferenceError] = useState<string | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLocale | null>(currentLocale);
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState(() =>
    getPhoneCountry(user?.phone, currentLocale)
  );
  const [isPhoneCountryOpen, setIsPhoneCountryOpen] = useState(false);
  const [editPhone, setEditPhone] = useState(() =>
    stripDialCode(user?.phone, getPhoneCountry(user?.phone, currentLocale))
  );
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | undefined>(user?.photoUrl);
  const [editPhotoPreviewUri, setEditPhotoPreviewUri] = useState<string | undefined>();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.locale) setSelectedLanguage(user.locale);
  }, [user?.locale]);

  const selectedLanguageDetails = LANGUAGE_OPTIONS.find(
    (language) => language.code === selectedLanguage
  );

  const changeLanguage = async (locale: SupportedLocale) => {
    if (updateLocale.isPending || locale === user?.locale) {
      setIsLanguageOpen(false);
      return;
    }

    setLanguageError(null);
    try {
      const updatedUser = await updateLocale.mutateAsync(locale);
      setSelectedLanguage(updatedUser.locale);
      setIsLanguageOpen(false);
    } catch (error) {
      setLanguageError(getApiErrorMessage(error, t("language.updateError")));
    }
  };

  const openProfileEdit = () => {
    const phoneCountry = getPhoneCountry(user?.phone, currentLocale);
    setSelectedPhoneCountry(phoneCountry);
    setIsPhoneCountryOpen(false);
    setEditPhone(stripDialCode(user?.phone, phoneCountry));
    setEditPhotoUrl(user?.photoUrl);
    setEditPhotoPreviewUri(undefined);
    setEditError(null);
    setShowProfileEdit(true);
  };

  const pickProfilePhoto = async () => {
    setEditError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setEditError(t("profile.photoPermission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setEditPhotoPreviewUri(asset.uri);
      setIsUploadingPhoto(true);

      const uploaded = await uploadMedia(asset.uri, "photo");
      setEditPhotoUrl(uploaded.url);
    } catch (error) {
      setEditError(getApiErrorMessage(error, t("profile.photoUploadError")));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const saveProfileEdit = async () => {
    const firstName = user?.firstName?.trim();
    const lastName = user?.lastName?.trim();

    if (!firstName || !lastName) {
      setEditError(t("profile.missingName"));
      return;
    }

    setEditError(null);

    try {
      await completeProfile.mutateAsync({
        firstName,
        lastName,
        ...(editPhotoUrl ? { photoUrl: editPhotoUrl } : {}),
        ...(editPhone.trim() ? { phone: `${selectedPhoneCountry.dialCode} ${editPhone.trim()}` } : {}),
      });
      setShowProfileEdit(false);
    } catch (error) {
      setEditError(getApiErrorMessage(error, t("profile.saveError")));
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      t("profile.deactivateTitle"),
      t("profile.deactivateBody"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.deactivateTitle"),
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onError: (error) => {
                Alert.alert(
                  t("profile.deleteErrorTitle"),
                  getApiErrorMessage(
                    error,
                    t("profile.deleteError")
                  )
                );
              },
            });
          },
        },
      ]
    );
  };

  const notificationPreferenceFields: EditableNotificationPreference[] = [
    "newApplicant",
    "newMessage",
    "offers",
    "applicationUpdates",
    "jobStatusChanges",
    "jobEdits",
    "cancellations",
    "completions",
  ];

  if (showNotificationSettings) {
    return (
      <Screen scroll>
        <YStack gap="$4" paddingTop="$4">
          <XStack alignItems="center" gap="$3">
            <XStack
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
              onPress={() => setShowNotificationSettings(false)}
              role="button"
              aria-label={t("common.back")}
            >
              <Ionicons name="chevron-back" size={24} color="#4F8266" />
            </XStack>
            <Text variant="h3">{t("notificationPreferences.title")}</Text>
          </XStack>

          <Text variant="body" muted>{t("notificationPreferences.description")}</Text>

          <Card padding="$0" overflow="hidden">
            {notificationPreferenceFields.map((field, index) => (
              <XStack
                key={field}
                minHeight={62}
                paddingHorizontal="$4"
                alignItems="center"
                gap="$3"
                borderBottomWidth={index === notificationPreferenceFields.length - 1 ? 0 : 1}
                borderBottomColor="$borderColor"
              >
                <Text variant="body" flex={1}>{t(`notificationPreferences.fields.${field}`)}</Text>
                <Switch
                  checked={user?.notificationPrefs[field] ?? true}
                  onCheckedChange={(checked) => {
                    setNotificationPreferenceError(null);
                    updateNotificationPreferences.mutate(
                      { [field]: checked },
                      {
                        onError: (error) =>
                          setNotificationPreferenceError(
                            getApiErrorMessage(error, t("notificationPreferences.updateError"))
                          ),
                      }
                    );
                  }}
                  disabled={updateNotificationPreferences.isPending}
                  backgroundColor={user?.notificationPrefs[field] ?? true ? "$primary" : "$borderColor"}
                  role="switch"
                  aria-label={t("notificationPreferences.toggleLabel", {
                    preference: t(`notificationPreferences.fields.${field}`),
                  })}
                >
                  <Switch.Thumb backgroundColor="white" />
                </Switch>
              </XStack>
            ))}
          </Card>

          {notificationPreferenceError ? (
            <Text variant="small" color="$danger">{notificationPreferenceError}</Text>
          ) : null}
        </YStack>
      </Screen>
    );
  }

  if (showProfileEdit) {
    const displayPhotoUri = editPhotoPreviewUri ?? editPhotoUrl;

    return (
      <Screen scroll>
        <YStack gap="$5" paddingTop="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <Pressable
              onPress={() => setShowProfileEdit(false)}
              accessibilityRole="button"
              accessibilityLabel={t("profile.backToSettings")}
            >
              <Text fontSize={13} color="#4A4A4A" fontWeight="600">
                {t("common.back").toUpperCase()}
              </Text>
            </Pressable>

            <Pressable
              onPress={isUploadingPhoto || completeProfile.isPending ? undefined : saveProfileEdit}
              accessibilityRole="button"
              accessibilityLabel={t("profile.saveProfile")}
              accessibilityState={{
                busy: isUploadingPhoto || completeProfile.isPending,
                disabled: isUploadingPhoto || completeProfile.isPending,
              }}
            >
              <Text
                fontSize={13}
                color={isUploadingPhoto || completeProfile.isPending ? "#9CA3AF" : "#4A4A4A"}
                fontWeight="600"
              >
                {t("common.save").toUpperCase()}
              </Text>
            </Pressable>
          </XStack>

          <YStack alignItems="center" gap="$2">
            <Pressable
              onPress={pickProfilePhoto}
              accessibilityRole="button"
              accessibilityLabel={t("profile.changePhoto")}
              disabled={isUploadingPhoto}
            >
              <YStack
                width={88}
                height={88}
                borderRadius={4}
                borderWidth={1}
                borderColor="#4F8266"
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
                backgroundColor="#F8FAF8"
              >
                {displayPhotoUri ? (
                  <Image
                    source={{ uri: displayPhotoUri }}
                    resizeMode="cover"
                    style={{ width: 86, height: 86, borderRadius: 3 }}
                    onError={() => setEditError(t("profile.photoDisplayError"))}
                  />
                ) : isUploadingPhoto ? (
                  <ActivityIndicator color="#4F8266" />
                ) : (
                  <Ionicons name="camera-outline" size={30} color="#4F8266" />
                )}
              </YStack>
            </Pressable>

            <Text fontSize={14} color="#4A4A4A" onPress={pickProfilePhoto}>
              {t("profile.changePhoto")}
            </Text>
          </YStack>

          <YStack gap="$4">
            <XStack gap="$3">
              <YStack flex={1}>
                <ProfilePillInput
                  value={user?.firstName ?? ""}
                  accessibilityLabel={t("profile.registeredFirstName")}
                />
              </YStack>

              <YStack flex={1}>
                <ProfilePillInput
                  value={user?.lastName ?? ""}
                  accessibilityLabel={t("profile.registeredLastName")}
                />
              </YStack>
            </XStack>

            <PhoneNumberInput
              country={selectedPhoneCountry}
              isCountryOpen={isPhoneCountryOpen}
              value={editPhone}
              onChangeText={setEditPhone}
              onCountryPress={() => setIsPhoneCountryOpen((current) => !current)}
              onCountryChange={(country) => {
                setSelectedPhoneCountry(country);
                setIsPhoneCountryOpen(false);
              }}
            />

            <ProfilePillInput
              value={user?.email ?? ""}
              keyboardType="email-address"
              accessibilityLabel={t("profile.registeredEmail")}
            />
          </YStack>

          {editError ? (
            <Text variant="small" color="$danger" textAlign="center">
              {editError}
            </Text>
          ) : null}
        </YStack>
      </Screen>
    );
  }

  if (showSettings) {
    return (
      <Screen scroll>
        <YStack gap="$4" paddingTop="$4">
          <XStack>
            <Pressable
              onPress={() => setShowSettings(false)}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="chevron-back" size={24} color="#4F8266" />
            </Pressable>
          </XStack>

          <YStack alignItems="center" gap="$2">
            <Avatar uri={user?.photoUrl} name={user?.firstName} size={88} />

            <Text variant="h4">
              {user?.firstName} {user?.lastName}
            </Text>

            <Pressable
              onPress={openProfileEdit}
              accessibilityRole="button"
              accessibilityLabel={t("profile.edit")}
            >
              <YStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="#4F8266"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="pencil" size={18} color="white" />
              </YStack>
            </Pressable>
          </YStack>

          <YStack height={1} backgroundColor="#CBD2C4" />

          <YStack gap="$3">
            <XStack
              height={58}
              borderWidth={1.2}
              borderColor="#232920"
              borderRadius={28}
              overflow="hidden"
              backgroundColor="white"
            >
              <XStack
                flex={1}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                onPress={() => setShowNotificationSettings(true)}
                role="button"
                aria-label={t("notificationPreferences.title")}
              >
                <Ionicons name="notifications-outline" size={16} color="#232920" />
                <Text fontSize={11} fontWeight="600">
                  {t("notificationPreferences.shortTitle").toUpperCase()}
                </Text>
              </XStack>

              <YStack width={1} backgroundColor="#232920" />

              <XStack
                flex={1}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                onPress={() => { }}
                accessibilityRole="button"
                accessibilityLabel={t("profile.invite")}
              >
                <Ionicons name="share-social-outline" size={16} color="#232920" />
                <Text fontSize={11} fontWeight="600">
                  {t("profile.invite").toUpperCase()}
                </Text>
              </XStack>
            </XStack>

            <XStack
              height={58}
              borderWidth={1.2}
              borderColor="#232920"
              borderRadius={28}
              overflow="hidden"
              backgroundColor="white"
            >
              <XStack
                flex={1}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                onPress={() => { }}
                accessibilityRole="button"
                accessibilityLabel={t("profile.feedback")}
              >
                <Ionicons name="heart-outline" size={16} color="#232920" />
                <Text fontSize={11} fontWeight="600">
                  {t("profile.feedback").toUpperCase()}
                </Text>
              </XStack>

              <YStack width={1} backgroundColor="#232920" />

              <XStack
                flex={1}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                onPress={() => { }}
                accessibilityRole="button"
                accessibilityLabel={t("profile.help")}
              >
                <Ionicons name="help-circle-outline" size={16} color="#232920" />
                <Text fontSize={11} fontWeight="600">
                  {t("profile.help").toUpperCase()}
                </Text>
              </XStack>
            </XStack>
          </YStack>

          <YStack gap="$2">
            <XStack
              height={52}
              paddingHorizontal="$4"
              alignItems="center"
              justifyContent="space-between"
              borderWidth={1.5}
              borderColor="$borderColor"
              borderRadius="$md"
              backgroundColor="$backgroundStrong"
              onPress={() => setIsLanguageOpen((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={t("language.select")}
            >
              <Text variant="body" muted={!selectedLanguageDetails}>
                {selectedLanguageDetails?.label ?? t("language.select")}
              </Text>

              <Ionicons
                name={isLanguageOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#6B7280"
              />
            </XStack>

            {isLanguageOpen ? (
              <YStack
                borderWidth={1.5}
                borderColor="$borderColor"
                borderRadius="$md"
                backgroundColor="$backgroundStrong"
                overflow="hidden"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <XStack
                    key={language.code}
                    height={48}
                    paddingHorizontal="$4"
                    alignItems="center"
                    gap="$3"
                    borderBottomWidth={1}
                    borderBottomColor="$borderColor"
                    opacity={updateLocale.isPending ? 0.6 : 1}
                    onPress={() => void changeLanguage(language.code)}
                    accessibilityRole="button"
                    accessibilityLabel={t("language.selectOption", { language: language.label })}
                  >
                    <Text fontSize={24}>{language.flag}</Text>
                    <Text variant="body">{language.label}</Text>
                  </XStack>
                ))}
              </YStack>
            ) : null}
            {languageError ? (
              <Text variant="small" color="$danger">
                {languageError}
              </Text>
            ) : null}
          </YStack>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <YStack gap="$4" paddingTop="$4">
        <XStack justifyContent="flex-end">
          <Pressable
            onPress={() => setShowSettings(true)}
            accessibilityRole="button"
            accessibilityLabel={t("accessibility.profileSettings")}
          >
            <Ionicons name="settings-outline" size={28} color="#4F8266" />
          </Pressable>
        </XStack>
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
          <Text variant="label">{t("profile.rating")}</Text>
          <Text variant="h3">
            {(user?.rating.average ?? 0).toFixed(1)} / 5 · {t("profile.reviewCount", { count: user?.rating.count ?? 0 })}
          </Text>
        </Card>

        <Card>
          <Text variant="label">{t("profile.subscription")}</Text>
          <Text variant="h4" textTransform="capitalize">
            BOB-{t(`subscriptionTiers.${user?.subscriptionTier ?? "free"}`)}
          </Text>
        </Card>

        <Button variant="outline" onPress={() => logout.mutate()} loading={logout.isPending}>
          {t("common.logout")}
        </Button>
        <Button
          variant="destructive"
          onPress={confirmAccountDeletion}
          loading={deleteAccount.isPending}
        >
          {t("profile.deactivateTitle")}
        </Button>
      </YStack>
    </Screen>
  );
}
