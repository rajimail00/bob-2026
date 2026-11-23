import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

interface MediaItem {
  url: string;
  type: "photo" | "video";
}

interface MediaCarouselProps {
  media: MediaItem[];
}

/** Swipeable photo/video preview with dot indicators — used on the job detail screen and the
 * post-a-job review step, so both show media exactly the same way. */
export function MediaCarousel({ media }: MediaCarouselProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - 32;

  if (media.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <>
      <YStack gap="$2">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {media.map((item) => {
            const preview = (
              <XStack
                width={width}
                aspectRatio={16 / 9}
                position="relative"
                overflow="hidden"
                borderRadius={14}
                backgroundColor="$neutral100"
              >
                <Image source={{ uri: item.url }} resizeMode="cover" style={styles.previewImage} />
                {item.type === "video" ? (
                  <XStack style={styles.previewOverlay} alignItems="center" justifyContent="center">
                    <Ionicons name="play-circle" size={48} color="white" />
                  </XStack>
                ) : (
                  <XStack style={styles.expandBadge} alignItems="center" justifyContent="center">
                    <Ionicons name="expand-outline" size={18} color="white" />
                  </XStack>
                )}
              </XStack>
            );

            return item.type === "photo" ? (
              <Pressable
                key={item.url}
                onPress={() => setLightboxUri(item.url)}
                accessibilityRole="button"
                accessibilityLabel={t("mediaCarousel.openImage")}
              >
                {preview}
              </Pressable>
            ) : (
              <YStack key={item.url}>{preview}</YStack>
            );
          })}
        </ScrollView>

        {media.length > 1 ? (
          <XStack gap="$2" justifyContent="center">
            {media.map((item, index) => (
              <YStack
                key={item.url}
                width={6}
                height={6}
                borderRadius={3}
                backgroundColor={index === activeIndex ? "$primary" : "$neutral200"}
              />
            ))}
          </XStack>
        ) : null}
      </YStack>

      <Modal
        visible={Boolean(lightboxUri)}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
          <SafeAreaView style={styles.lightboxSafeArea} edges={["top", "right", "bottom", "left"]}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setLightboxUri(null)}
              accessibilityRole="button"
              accessibilityLabel={t("mediaCarousel.closeImage")}
            >
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
            {lightboxUri ? (
              <Image
                source={{ uri: lightboxUri }}
                resizeMode="contain"
                style={styles.lightboxImage}
              />
            ) : null}
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  expandBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  lightboxSafeArea: {
    flex: 1,
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(35,41,32,0.72)",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
});
