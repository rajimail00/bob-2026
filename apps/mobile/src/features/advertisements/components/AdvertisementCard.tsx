import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { Advertisement } from "../types/advertisement.types";

interface AdvertisementCardProps {
  advertisement: Advertisement;
  screenActive?: boolean;
  playbackAllowed?: boolean;
  onPlaybackChange?: (playing: boolean) => void;
}

function isSecureUrl(url?: string) {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

async function openSecureUrl(url?: string) {
  if (!url || !isSecureUrl(url)) return;
  try {
    if (!(await Linking.canOpenURL(url))) return;
    await Linking.openURL(url);
  } catch {
    // Invalid or unsupported links are ignored; the backend also enforces HTTPS.
  }
}

export function AdvertisementCard({ advertisement, screenActive = true, playbackAllowed = true, onPlaybackChange }: AdvertisementCardProps) {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const canOpen = isSecureUrl(advertisement.destinationUrl);

  return (
    <Pressable
      onPress={canOpen ? () => void openSecureUrl(advertisement.destinationUrl) : undefined}
      role={canOpen ? "button" : undefined}
      aria-label={canOpen ? t("advertisements.open") : t("advertisements.label")}
    >
      <Card elevated padding={0} overflow="hidden" borderColor="$brand300">
        <YStack height={180} backgroundColor="$neutral100" alignItems="center" justifyContent="center">
          {advertisement.media?.type === "image" && !imageFailed ? (
            <Image
              source={{ uri: advertisement.media.url }}
              resizeMode="cover"
              style={{ width: "100%", height: 180 }}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => { setImageLoading(false); setImageFailed(true); }}
            />
          ) : advertisement.media?.type === "video" ? (
            <AdvertisementVideo
              url={advertisement.media.url}
              active={screenActive && playbackAllowed}
              onPlaybackChange={onPlaybackChange}
            />
          ) : (
            <MediaUnavailable />
          )}
          {imageLoading && advertisement.media?.type === "image" && !imageFailed ? <ActivityIndicator color="#4F8266" style={{ position: "absolute" }} /> : null}
          {imageFailed ? <MediaUnavailable /> : null}
          <XStack position="absolute" top="$2" left="$2" backgroundColor="$backgroundStrong" borderRadius="$pill" paddingHorizontal="$3" paddingVertical="$1">
            <Text variant="small" color="$primary" fontWeight="700">{t("advertisements.sponsored")}</Text>
          </XStack>
        </YStack>
      </Card>
    </Pressable>
  );
}

function AdvertisementVideo({ url, active, onPlaybackChange }: { url: string; active: boolean; onPlaybackChange?: (playing: boolean) => void }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.muted = true;
  });

  useEffect(() => {
    const subscription = player.addListener("playToEnd", () => {
      setPlaying(false);
      onPlaybackChange?.(false);
    });
    return () => subscription.remove();
  }, [onPlaybackChange, player]);

  useEffect(() => {
    if (!active && playing) {
      player.pause();
      setPlaying(false);
      onPlaybackChange?.(false);
    }
  }, [active, onPlaybackChange, player, playing]);

  const toggle = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
      onPlaybackChange?.(false);
    } else {
      player.play();
      setPlaying(true);
      onPlaybackChange?.(true);
    }
  };

  return (
    <YStack width="100%" height={180} backgroundColor="$neutral800">
      <VideoView player={player} style={{ width: "100%", height: 180 }} contentFit="cover" nativeControls={false} />
      <Pressable
        onPress={(event) => { event.stopPropagation(); toggle(); }}
        role="button"
        aria-label={t(playing ? "advertisements.pauseVideo" : "advertisements.playVideo")}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name={playing ? "pause-circle" : "play-circle"} size={52} color="white" />
      </Pressable>
    </YStack>
  );
}

function MediaUnavailable() {
  const { t } = useTranslation();
  return (
    <YStack position="absolute" top={0} right={0} bottom={0} left={0} alignItems="center" justifyContent="center" gap="$2" backgroundColor="$neutral100">
      <Ionicons name="image-outline" size={34} color="#78826F" />
      <Text variant="caption">{t("advertisements.mediaUnavailable")}</Text>
    </YStack>
  );
}
