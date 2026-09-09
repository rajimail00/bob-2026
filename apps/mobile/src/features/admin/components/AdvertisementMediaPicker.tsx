import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { ActivityIndicator, Alert, Image, Pressable } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { uploadMedia } from "@/features/media/api/media.api";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AdvertisementMedia } from "@/features/advertisements/types/advertisement.types";
import { useTranslation } from "react-i18next";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_DURATION_MS = 60_000;

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  useEffect(() => () => player.pause(), [player]);
  return <VideoView player={player} style={{ width: "100%", height: 190 }} contentFit="cover" nativeControls />;
}

export function AdvertisementMediaPicker({
  media,
  onChange,
}: {
  media?: AdvertisementMedia;
  onChange: (media?: AdvertisementMedia) => void;
}) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  const chooseMedia = async () => {
    setError(undefined);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("mediaPicker.libraryPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
        setError(t("mediaPicker.fileTooLarge"));
        return;
      }
      if (asset.type === "video" && asset.duration && asset.duration > MAX_VIDEO_DURATION_MS) {
        setError(t("admin.advertisements.videoTooLong"));
        return;
      }
      const kind = asset.type === "video" ? "video" : "photo";
      setIsUploading(true);
      const uploaded = await uploadMedia(asset.uri, kind);
      onChange({
        type: uploaded.type === "video" ? "video" : "image",
        url: uploaded.url,
        mimeType: asset.mimeType,
      });
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, t("admin.advertisements.mediaUploadError")));
    } finally {
      setIsUploading(false);
    }
  };

  const requestChoose = () => {
    if (!media) {
      void chooseMedia();
      return;
    }
    Alert.alert(t("admin.advertisements.replaceMediaTitle"), t("admin.advertisements.replaceMediaBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.advertisements.replaceMedia"), onPress: () => void chooseMedia() },
    ]);
  };

  const requestRemove = () => Alert.alert(
    t("admin.advertisements.removeMediaTitle"),
    t("admin.advertisements.removeMediaBody"),
    [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.advertisements.removeMedia"), style: "destructive", onPress: () => onChange(undefined) },
    ]
  );

  return (
    <YStack gap="$2">
      <Text variant="label">{t("admin.advertisements.media")}</Text>
      <Pressable
        onPress={isUploading ? undefined : requestChoose}
        role="button"
        aria-label={media ? t("admin.advertisements.replaceMedia") : t("admin.advertisements.uploadMedia")}
      >
        <YStack height={190} borderRadius="$lg" overflow="hidden" backgroundColor="$neutral100" borderWidth={1.5} borderColor="$borderColor" alignItems="center" justifyContent="center" gap="$2">
          {media?.type === "image" ? <Image source={{ uri: media.url }} resizeMode="cover" style={{ width: "100%", height: 190 }} /> : null}
          {media?.type === "video" ? <VideoPreview url={media.url} /> : null}
          {!media ? <><Ionicons name="cloud-upload-outline" size={48} color="#4F8266" /><Text color="$primary">{t("admin.advertisements.uploadMedia")}</Text></> : null}
          {isUploading ? <YStack position="absolute" top={0} right={0} bottom={0} left={0} backgroundColor="rgba(255,255,255,0.82)" alignItems="center" justifyContent="center" gap="$2"><ActivityIndicator size="large" color="#4F8266" /><Text>{t("admin.advertisements.uploading")}</Text></YStack> : null}
        </YStack>
      </Pressable>
      <Text variant="caption" muted>{t("admin.advertisements.mediaHint")}</Text>
      {media ? <XStack gap="$2"><Button size="sm" flex={1} variant="outline" onPress={requestChoose}>{t("admin.advertisements.replaceMedia")}</Button><Button size="sm" flex={1} variant="ghost" onPress={requestRemove}>{t("admin.advertisements.removeMedia")}</Button></XStack> : null}
      {error ? <Text variant="small" color="$danger">{error}</Text> : null}
    </YStack>
  );
}
