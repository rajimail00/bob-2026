import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useCompleteProfile } from "../hooks/useAuthMutations";
import { createProfileSchema, type CreateProfileFormValues } from "../validation/auth.schema";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image } from "react-native";
import { uploadMedia } from "@/features/media/api/media.api";

/** Reached once a user has a verified session but hasn't set first/last name yet — RootNavigator gates on this. */
export function CreateProfileScreen() {
  const { t } = useTranslation();
  const completeProfile = useCompleteProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);
const [photoUrl, setPhotoUrl] = useState<string | undefined>();
const [photoPreviewUri, setPhotoPreviewUri] = useState<string | undefined>();
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const [photoError, setPhotoError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfileFormValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
     await completeProfile.mutateAsync({
  ...values,
  ...(photoUrl ? { photoUrl } : {}),
});
      // RootNavigator now sees a fully-set-up user and routes to the main tabs automatically.
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("auth.errors.firstNameRequired")));
    }
  });

const pickProfilePhoto = async () => {
  setPhotoError(null);

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Photo library access is off.");
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
setPhotoPreviewUri(asset.uri);

setIsUploadingPhoto(true);
const uploaded = await uploadMedia(asset.uri, "photo");
setPhotoUrl(uploaded.url);
  } catch (error) {
    setPhotoError(getApiErrorMessage(error, "Couldn't upload that photo."));
  } finally {
    setIsUploadingPhoto(false);
  }
};
const displayPhotoUri = photoPreviewUri ?? photoUrl;
  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <Text variant="h2">{t("auth.createProfileTitle")}</Text>
<YStack alignItems="center" gap="$2">
  <YStack
    width={104}
    height={104}
    borderRadius={52}
    backgroundColor="$primary"
    alignItems="center"
    justifyContent="center"
    overflow="hidden"
  >
    {displayPhotoUri ? (
  <Image
    source={{ uri: displayPhotoUri }}
    resizeMode="cover"
    style={{ width: 104, height: 104, borderRadius: 52 }}
    onError={() => setPhotoError("Selected photo could not be displayed.")}
  />
) : isUploadingPhoto ? (
      <ActivityIndicator color="white" />
    ) : (
      <Ionicons name="camera-outline" size={36} color="white" />
    )}
  </YStack>

  <Text variant="small" color="$primary" onPress={pickProfilePhoto}>
    change
  </Text>

  {photoError ? (
    <Text variant="small" color="$danger">
      {photoError}
    </Text>
  ) : null}
</YStack>
        <YStack gap="$4">
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                label={t("auth.firstNameLabel")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.firstName ? t(errors.firstName.message ?? "") : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input
                label={t("auth.lastNameLabel")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.lastName ? t(errors.lastName.message ?? "") : undefined}
              />
            )}
          />
        </YStack>

        {submitError ? (
          <Text variant="small" color="$danger">
            {submitError}
          </Text>
        ) : null}

        <Button
  onPress={onSubmit}
  loading={isSubmitting || completeProfile.isPending || isUploadingPhoto}
  disabled={isUploadingPhoto}
  fullWidth
>
  {t("common.continue")}
</Button>
      </YStack>
    </Screen>
  );
}
