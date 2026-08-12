import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { uploadMedia, type UploadedMedia } from "@/features/media/api/media.api";

const MAX_ITEMS = 4;
const THUMB_SIZE = 84;

interface MediaPickerProps {
  media: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
}

/** Photo/video capture + Cloudinary upload for the post-a-job wizard's media step. */
export function MediaPicker({ media, onChange }: MediaPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAddMore = media.length < MAX_ITEMS;

  const capture = async (kind: "photo" | "video") => {
    setError(null);
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

    setIsUploading(true);
    try {
      const uploaded = await uploadMedia(result.assets[0].uri, kind);
      onChange([...media, uploaded]);
    } catch {
      setError("Couldn't upload that file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  return (
    <YStack gap="$3">
      <XStack gap="$3">
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

        {canAddMore ? (
          isUploading ? (
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
          ) : (
            <XStack gap="$2">
              <YStack
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                borderRadius={10}
                borderWidth={1.5}
                borderColor="$borderColor"
                borderStyle="dashed"
                alignItems="center"
                justifyContent="center"
                gap="$1"
                onPress={() => capture("photo")}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
              >
                <Ionicons name="camera-outline" size={24} color="#4F8266" />
                <Text variant="caption">Photo</Text>
              </YStack>
              <YStack
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                borderRadius={10}
                borderWidth={1.5}
                borderColor="$borderColor"
                borderStyle="dashed"
                alignItems="center"
                justifyContent="center"
                gap="$1"
                onPress={() => capture("video")}
                accessibilityRole="button"
                accessibilityLabel="Add video"
              >
                <Ionicons name="videocam-outline" size={24} color="#4F8266" />
                <Text variant="caption">Video</Text>
              </YStack>
            </XStack>
          )
        ) : null}
      </XStack>

      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
