import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { uploadMedia, type UploadedMedia } from "@/features/media/api/media.api";
import { getApiErrorMessage } from "@/lib/apiClient";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 2;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const THUMB_SIZE = 84;

interface MediaPickerProps {
  media: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
}

function isOversized(fileSize: number | undefined): boolean {
  return Boolean(fileSize && fileSize > MAX_FILE_BYTES);
}

/** Photo/video capture + Cloudinary upload for the post-a-job wizard's media step. */
export function MediaPicker({ media, onChange }: MediaPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const canAddPhoto = photoCount < MAX_PHOTOS;
  const canAddVideo = videoCount < MAX_VIDEOS;

  const pickFromLibrary = async (kind: "photo" | "video") => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo library access is off — enable it in settings to add photos or videos.");
        return;
      }

      const remaining = kind === "photo" ? MAX_PHOTOS - photoCount : MAX_VIDEOS - videoCount;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === "photo" ? ["images"] : ["videos"],
        quality: 0.7,
        allowsMultipleSelection: kind === "photo",
        selectionLimit: remaining,
      });
      if (result.canceled || result.assets.length === 0) return;

      const oversized = result.assets.some((a) => isOversized(a.fileSize));
      if (oversized) {
        setError("One of those files is over 10MB — please choose a shorter video or a smaller photo.");
        return;
      }

      setIsUploading(true);
      // Accumulate locally and commit once at the end — calling onChange per item would each
      // close over the same stale `media` prop from this render and clobber one another.
      const uploaded: UploadedMedia[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        // eslint-disable-next-line no-await-in-loop -- uploads must stay in order; this list is at most a handful of items
        uploaded.push(await uploadMedia(asset.uri, kind));
      }
      onChange([...media, ...uploaded]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't add that file. Please try again."));
    } finally {
      setIsUploading(false);
    }
  };

  const captureWithCamera = async (kind: "photo" | "video") => {
    setError(null);

    // Every native-module call below can throw — on Expo Go a native-side failure here (denied
    // permission mid-flow, codec issue, etc.) has to be caught here or it takes the whole app down.
    // Note: on lower-memory Android devices, opening the system Camera app can cause the OS to
    // kill Expo Go's process outright to reclaim RAM — that's a full process death, not a JS error,
    // and no try/catch here can prevent it. "Choose from library" below avoids that failure mode.
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera access is off — enable it in settings to add photos or videos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: kind === "photo" ? ["images"] : ["videos"],
        quality: 0.7,
        videoMaxDuration: 30,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (isOversized(asset.fileSize)) {
        setError("That file is over 10MB — please choose a shorter video or a smaller photo.");
        return;
      }

      setIsUploading(true);
      const uploaded = await uploadMedia(asset.uri, kind);
      onChange([...media, uploaded]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't add that file. Please try again."));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  return (
    <YStack gap="$3">
      <XStack gap="$3" flexWrap="wrap">
        {media.map((item, index) => (
          <YStack key={item.url} position="relative">
            {item.type === "photo" ? (
              <Image
                source={{ uri: item.url }}
                style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 10 }}
              />
            ) : (
              <YStack
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                borderRadius={10}
                backgroundColor="$neutral800"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="videocam" size={28} color="white" />
              </YStack>
            )}
            <XStack
              position="absolute"
              top={-6}
              right={-6}
              width={22}
              height={22}
              borderRadius={11}
              backgroundColor="$backgroundStrong"
              alignItems="center"
              justifyContent="center"
              onPress={() => removeAt(index)}
              accessibilityRole="button"
              accessibilityLabel="Remove"
            >
              <Ionicons name="close-circle" size={22} color="#C1554B" />
            </XStack>
          </YStack>
        ))}

        {isUploading ? (
          <YStack
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            borderRadius={10}
            borderWidth={1.5}
            borderColor="$borderColor"
            alignItems="center"
            justifyContent="center"
          >
            <ActivityIndicator color="#4F8266" />
          </YStack>
        ) : null}
      </XStack>

      {!isUploading ? (
        <YStack gap="$2">
          {canAddPhoto ? (
            <XStack gap="$2">
              <PickerButton icon="images-outline" label={`Photo from gallery (${photoCount}/${MAX_PHOTOS})`} onPress={() => pickFromLibrary("photo")} />
              <PickerButton icon="camera-outline" label="Use camera" onPress={() => captureWithCamera("photo")} compact />
            </XStack>
          ) : null}
          {canAddVideo ? (
            <XStack gap="$2">
              <PickerButton icon="film-outline" label={`Video from gallery (${videoCount}/${MAX_VIDEOS})`} onPress={() => pickFromLibrary("video")} />
              <PickerButton icon="videocam-outline" label="Use camera" onPress={() => captureWithCamera("video")} compact />
            </XStack>
          ) : null}
        </YStack>
      ) : null}

      <Text variant="caption" muted>
        Up to {MAX_PHOTOS} photos and {MAX_VIDEOS} videos, 10MB each. Gallery is recommended — the
        camera can restart the app on some devices.
      </Text>

      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

function PickerButton({
  icon,
  label,
  onPress,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <XStack
      flex={compact ? undefined : 1}
      borderRadius="$md"
      borderWidth={1.5}
      borderColor="$borderColor"
      backgroundColor="$backgroundStrong"
      paddingHorizontal="$3"
      paddingVertical="$3"
      alignItems="center"
      gap="$2"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color="#4F8266" />
      {!compact ? (
        <Text variant="small" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </XStack>
  );
}
