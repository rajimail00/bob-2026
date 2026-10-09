import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { uploadMedia } from "@/features/media/api/media.api";
import { compressMedia } from "@/features/media/utils/compressMedia";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useTranslation } from "react-i18next";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function CategoryImagePicker({
  imageUrl,
  onChange,
}: {
  imageUrl?: string;
  onChange: (imageUrl?: string) => void;
}) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  const selectImage = async () => {
    setError(undefined);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("mediaPicker.libraryPermission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      setIsUploading(true);
      const prepared = await compressMedia(asset, "photo");
      if (prepared.fileSize > MAX_FILE_BYTES) {
        setError(t("mediaPicker.fileTooLarge"));
        return;
      }

      const uploaded = await uploadMedia(prepared.uri, "photo", {
        name: prepared.name,
        mimeType: prepared.mimeType,
      });
      onChange(uploaded.url);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, t("admin.categories.imageUploadError")));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <YStack gap="$2">
      <Pressable
        onPress={isUploading ? undefined : selectImage}
        role="button"
        aria-label={imageUrl ? t("admin.categories.replaceImage") : t("admin.categories.uploadImage")}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <YStack
          width="100%"
          maxWidth={280}
          aspectRatio={1}
          alignSelf="center"
          borderRadius="$lg"
          overflow="hidden"
          backgroundColor="$neutral100"
          borderWidth={1.5}
          borderColor="$borderColor"
          alignItems="center"
          justifyContent="center"
          gap="$2"
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          ) : (
            <>
              <Ionicons name="image-outline" size={58} color="#4F8266" />
              <Text color="$primary">{t("admin.categories.uploadImage")}</Text>
            </>
          )}
          {isUploading ? (
            <YStack position="absolute" top={0} right={0} bottom={0} left={0} backgroundColor="rgba(255,255,255,0.78)" alignItems="center" justifyContent="center">
              <ActivityIndicator size="large" color="#4F8266" />
            </YStack>
          ) : null}
        </YStack>
      </Pressable>
      <Text variant="caption" muted>{t("admin.categories.imageHint")}</Text>
      {imageUrl ? (
        <XStack gap="$2">
          <Button size="sm" flex={1} variant="outline" onPress={selectImage}>{t("admin.categories.replaceImage")}</Button>
          <Button size="sm" flex={1} variant="ghost" onPress={() => onChange(undefined)}>{t("admin.categories.removeImage")}</Button>
        </XStack>
      ) : null}
      {error ? <Text variant="small" color="$danger">{error}</Text> : null}
    </YStack>
  );
}
