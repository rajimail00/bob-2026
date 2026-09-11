import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useCompleteProfile } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import { uploadMedia } from "@/features/media/api/media.api";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { ProfileStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileEdit">;

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const completeProfile = useCompleteProfile();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string>();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const isBusy = isUploadingPhoto || completeProfile.isPending;
  const displayedPhoto = photoPreviewUri ?? photoUrl;

  const pickPhoto = async () => {
    setError(undefined);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("profile.photoPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      setPhotoPreviewUri(asset.uri);
      setIsUploadingPhoto(true);
      const uploaded = await uploadMedia(asset.uri, "photo");
      setPhotoUrl(uploaded.url);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, t("profile.photoUploadError")));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("profile.missingName"));
      return;
    }
    setError(undefined);
    try {
      await completeProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(photoUrl ? { photoUrl } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigation.goBack();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, t("profile.saveError")));
    }
  };

  return (
    <Screen scroll scrollBottomPadding={32}>
      <YStack gap="$5" paddingTop="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Pressable onPress={navigation.goBack} role="button" aria-label={t("profile.backToSettings")} hitSlop={10}>
            <Text fontWeight="600">{t("common.back").toUpperCase()}</Text>
          </Pressable>
          <Pressable
            onPress={() => void save()}
            disabled={isBusy}
            role="button"
            aria-label={t("profile.saveProfile")}
            accessibilityState={{ disabled: isBusy, busy: isBusy }}
            hitSlop={10}
          >
            <Text fontWeight="600" color={isBusy ? "$colorMuted" : "$primary"}>{t("common.save").toUpperCase()}</Text>
          </Pressable>
        </XStack>

        <YStack alignItems="center" gap="$2">
          <Pressable
            onPress={() => void pickPhoto()}
            disabled={isUploadingPhoto}
            role="button"
            aria-label={t("profile.changePhoto")}
          >
            <YStack width={104} height={104} borderRadius="$sm" borderWidth={1} borderColor="$primary" alignItems="center" justifyContent="center" overflow="hidden">
              {displayedPhoto ? (
                <Image
                  source={{ uri: displayedPhoto }}
                  style={{ width: 102, height: 102 }}
                  resizeMode="cover"
                  onError={() => setError(t("profile.photoDisplayError"))}
                />
              ) : isUploadingPhoto ? (
                <ActivityIndicator color="#4F8266" />
              ) : (
                <Ionicons name="camera-outline" size={32} color="#4F8266" />
              )}
            </YStack>
          </Pressable>
          <Text color="$primary" onPress={() => void pickPhoto()}>{t("profile.changePhoto")}</Text>
        </YStack>

        <XStack gap="$3">
          <YStack flex={1}>
            <Input
              label={t("profileFlow.firstName")}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              accessibilityLabel={t("profileFlow.firstName")}
            />
          </YStack>
          <YStack flex={1}>
            <Input
              label={t("profileFlow.lastName")}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              accessibilityLabel={t("profileFlow.lastName")}
            />
          </YStack>
        </XStack>
        <Input
          label={t("profile.phoneLabel")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t("profile.phonePlaceholder")}
          accessibilityLabel={t("profile.phoneLabel")}
        />
        <Input
          label={t("profileFlow.email")}
          value={user?.email ?? ""}
          editable={false}
          keyboardType="email-address"
          accessibilityLabel={t("profileFlow.email")}
        />
        {error ? <Text variant="small" color="$danger">{error}</Text> : null}
      </YStack>
    </Screen>
  );
}
