import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Dimensions, Image, ScrollView, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { XStack, YStack } from "tamagui";

interface MediaItem {
  url: string;
  type: "photo" | "video";
}

interface MediaCarouselProps {
  media: MediaItem[];
  height?: number;
}

/** Swipeable photo/video preview with dot indicators — used on the job detail screen and the
 * post-a-job review step, so both show media exactly the same way. */
export function MediaCarousel({ media, height = 220 }: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const width = Dimensions.get("window").width - 32;

  if (media.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <YStack gap="$2">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {media.map((item) => (
          <YStack key={item.url} width={width} height={height} position="relative">
            <Image source={{ uri: item.url }} style={{ width, height, borderRadius: 14 }} />
            {item.type === "video" ? (
              <XStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                alignItems="center"
                justifyContent="center"
                backgroundColor="rgba(0,0,0,0.15)"
              >
                <Ionicons name="play-circle" size={48} color="white" />
              </XStack>
            ) : null}
          </YStack>
        ))}
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
  );
}
