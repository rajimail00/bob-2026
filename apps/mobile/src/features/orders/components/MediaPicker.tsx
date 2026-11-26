import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { uploadMedia, type UploadedMedia } from "@/features/media/api/media.api";
import { compressMedia, type PreparedMedia } from "@/features/media/utils/compressMedia";
import { getApiErrorMessage } from "@/lib/apiClient";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 2;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 15;
const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;
const THUMB_SIZE = 84;

interface MediaPickerProps {
  media: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
}

type UploadStage = "compressing" | "uploading" | null;

function UploadedVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={{ width: 160, height: 90, borderRadius: 10, backgroundColor: "#111" }} contentFit="cover" nativeControls />;
}

function isOversized(fileSize: number | undefined): boolean {
  return Boolean(fileSize && fileSize > MAX_FILE_BYTES);
}

function isTooLong(duration: number | null | undefined): boolean {
  return Boolean(duration && duration > MAX_VIDEO_DURATION_MS);
}

function isPreparedVideoTooLong(duration: number | undefined): boolean {
  // react-native-compressor reports video metadata duration in seconds.
  return Boolean(duration && duration > MAX_VIDEO_DURATION_SECONDS);
}

function formatDuration(seconds: number): string {
  return `00:${String(Math.min(seconds, MAX_VIDEO_DURATION_SECONDS)).padStart(2, "0")}`;
}

async function prepareForUpload(asset: ImagePicker.ImagePickerAsset, kind: "photo" | "video", onProgress?: (progress: number) => void): Promise<PreparedMedia> {
  try {
    return await compressMedia(asset, kind, onProgress);
  } catch {
    throw new Error("MEDIA_COMPRESSION_FAILED");
  }
}

/** Photo/video capture + Cloudinary upload for the post-a-job wizard's media step. */
export function MediaPicker({ media, onChange }: MediaPickerProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const canAddPhoto = photoCount < MAX_PHOTOS;
  const canAddVideo = videoCount < MAX_VIDEOS;
  const isUploading = uploadStage !== null;

  const clearRecordingTimers = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (autoStopTimeout.current) clearTimeout(autoStopTimeout.current);
    countdownInterval.current = null;
    autoStopTimeout.current = null;
  };

  useEffect(() => () => clearRecordingTimers(), []);

  const showError = (err: unknown) => {
    setError(
      err instanceof Error && err.message === "MEDIA_TOO_LARGE_AFTER_COMPRESSION" ? t("mediaPicker.fileTooLarge")
        : err instanceof Error && err.message === "VIDEO_TOO_LONG" ? t("mediaPicker.videoTooLong", { seconds: MAX_VIDEO_DURATION_SECONDS })
          : err instanceof Error && err.message === "MEDIA_COMPRESSION_FAILED" ? t("mediaPicker.compressionError")
            : getApiErrorMessage(err, t("mediaPicker.error")),
    );
  };

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset, kind: "photo" | "video") => {
    if (kind === "video" && isTooLong(asset.duration)) throw new Error("VIDEO_TOO_LONG");

    setUploadStage("compressing");
    setUploadProgress(kind === "video" ? 0 : null);
    const prepared = await prepareForUpload(asset, kind, (progress) => setUploadProgress(Math.round(progress * 100)));
    if (kind === "video" && isPreparedVideoTooLong(prepared.duration)) throw new Error("VIDEO_TOO_LONG");
    if (isOversized(prepared.fileSize)) throw new Error("MEDIA_TOO_LARGE_AFTER_COMPRESSION");

    setUploadStage("uploading");
    setUploadProgress(0);
    return uploadMedia(prepared.uri, kind, { name: prepared.name, mimeType: prepared.mimeType }, setUploadProgress);
  };

  const pickFromLibrary = async (kind: "photo" | "video") => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("mediaPicker.libraryPermission"));
        return;
      }
      const remaining = kind === "photo" ? MAX_PHOTOS - photoCount : MAX_VIDEOS - videoCount;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === "photo" ? ["images"] : ["videos"], quality: 0.7,
        allowsMultipleSelection: kind === "photo", selectionLimit: remaining,
      });
      if (result.canceled || result.assets.length === 0) return;
      const uploaded: UploadedMedia[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        // eslint-disable-next-line no-await-in-loop
        uploaded.push(await uploadAsset(asset, kind));
      }
      onChange([...media, ...uploaded]);
    } catch (err) {
      showError(err);
    } finally {
      setUploadStage(null);
      setUploadProgress(null);
    }
  };

  const captureWithCamera = async (kind: "photo" | "video") => {
    if (kind === "video") {
      setError(null);
      const [cameraPermission, microphonePermission] = await Promise.all([
        Camera.requestCameraPermissionsAsync(), Camera.requestMicrophonePermissionsAsync(),
      ]);
      if (!cameraPermission.granted || !microphonePermission.granted) {
        setError(t("mediaPicker.cameraPermission"));
        return;
      }
      setCameraReady(false);
      setRecordedSeconds(0);
      setRecorderVisible(true);
      return;
    }

    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t("mediaPicker.cameraPermission"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;
      const uploaded = await uploadAsset(result.assets[0], "photo");
      onChange([...media, uploaded]);
    } catch (err) {
      showError(err);
    } finally {
      setUploadStage(null);
      setUploadProgress(null);
    }
  };

  const stopVideoRecording = async () => {
    clearRecordingTimers();
    if (!cameraRef.current) return;
    setIsRecording(false);
    await cameraRef.current?.stopRecording();
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current || !cameraReady || isRecording) return;
    setError(null);
    setIsRecording(true);
    setRecordedSeconds(0);
    countdownInterval.current = setInterval(() => setRecordedSeconds((previous) => Math.min(previous + 1, MAX_VIDEO_DURATION_SECONDS)), 1000);
    autoStopTimeout.current = setTimeout(() => { void stopVideoRecording(); }, MAX_VIDEO_DURATION_MS);

    try {
      const recorded = await cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_DURATION_SECONDS, maxFileSize: MAX_FILE_BYTES });
      if (!recorded?.uri) return;
      clearRecordingTimers();
      setIsRecording(false);
      setRecorderVisible(false);
      const uploaded = await uploadAsset({ uri: recorded.uri, type: "video", mimeType: "video/mp4", width: 0, height: 0 }, "video");
      onChange([...media, uploaded]);
    } catch (err) {
      showError(err);
    } finally {
      clearRecordingTimers();
      setIsRecording(false);
      setRecorderVisible(false);
      setUploadStage(null);
      setUploadProgress(null);
    }
  };

  const closeRecorder = () => {
    if (isRecording) return;
    clearRecordingTimers();
    setRecorderVisible(false);
  };

  const removeAt = (index: number) => onChange(media.filter((_, i) => i !== index));
  const progressLabel = uploadStage === "compressing" ? t("mediaPicker.compressing", { progress: uploadProgress ?? 0 }) : uploadStage === "uploading" ? t("mediaPicker.uploading", { progress: uploadProgress ?? 0 }) : null;

  return (
    <YStack gap="$3">
      <XStack gap="$3" flexWrap="wrap">
        {media.map((item, index) => (
          <YStack key={item.url} position="relative">
            {item.type === "photo" ? <Image source={{ uri: item.url }} style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 10 }} /> : <UploadedVideoPreview uri={item.url} />}
            <XStack position="absolute" top={-6} right={-6} width={22} height={22} borderRadius={11} backgroundColor="$backgroundStrong" alignItems="center" justifyContent="center" onPress={() => removeAt(index)} accessibilityRole="button" accessibilityLabel={t("mediaPicker.remove")}>
              <Ionicons name="close-circle" size={22} color="#C1554B" />
            </XStack>
          </YStack>
        ))}
        {isUploading ? <YStack width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={10} borderWidth={1.5} borderColor="$borderColor" alignItems="center" justifyContent="center"><ActivityIndicator color="#4F8266" /></YStack> : null}
      </XStack>

      {!isUploading ? <YStack gap="$2">
        {canAddPhoto ? <XStack gap="$2"><PickerButton icon="images-outline" label={t("mediaPicker.photoGallery", { count: photoCount, max: MAX_PHOTOS })} onPress={() => void pickFromLibrary("photo")} /><PickerButton icon="camera-outline" label={t("mediaPicker.camera")} onPress={() => void captureWithCamera("photo")} compact /></XStack> : null}
        {canAddVideo ? <XStack gap="$2"><PickerButton icon="film-outline" label={t("mediaPicker.videoGallery", { count: videoCount, max: MAX_VIDEOS })} onPress={() => void pickFromLibrary("video")} /><PickerButton icon="videocam-outline" label={t("mediaPicker.recordVideo")} onPress={() => void captureWithCamera("video")} compact /></XStack> : null}
      </YStack> : null}

      <Text variant="caption" muted>{t("mediaPicker.limits", { photos: MAX_PHOTOS, videos: MAX_VIDEOS, seconds: MAX_VIDEO_DURATION_SECONDS })}</Text>
      {progressLabel ? <Text variant="small" color="$primary">{progressLabel}</Text> : null}
      {error ? <Text variant="small" color="$danger">{error}</Text> : null}

      <Modal visible={recorderVisible} animationType="slide" onRequestClose={closeRecorder} statusBarTranslucent>
        <View style={styles.recorder}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" videoQuality="480p" onCameraReady={() => setCameraReady(true)} />
          <View style={styles.recorderHeader}>
            <Pressable onPress={closeRecorder} disabled={isRecording} accessibilityRole="button" accessibilityLabel={t("mediaPicker.closeRecorder")} style={styles.closeButton}><Ionicons name="close" size={28} color="#FFFFFF" /></Pressable>
            <Text color="#FFFFFF" fontWeight="700">{t("mediaPicker.recordingLimit", { seconds: MAX_VIDEO_DURATION_SECONDS })}</Text>
          </View>
          <View style={styles.recorderControls}>
            <Text color="#FFFFFF" variant="h2">{formatDuration(recordedSeconds)} / {formatDuration(MAX_VIDEO_DURATION_SECONDS)}</Text>
            <Text color="#FFFFFF" variant="small">{isRecording ? t("mediaPicker.recording", { seconds: MAX_VIDEO_DURATION_SECONDS }) : t("mediaPicker.recordReady")}</Text>
            <Pressable onPress={() => void (isRecording ? stopVideoRecording() : startVideoRecording())} disabled={!cameraReady} accessibilityRole="button" accessibilityLabel={isRecording ? t("mediaPicker.stopRecording") : t("mediaPicker.startRecording")} style={[styles.recordButton, isRecording && styles.recordButtonActive, !cameraReady && styles.recordButtonDisabled]}><View style={isRecording ? styles.stopSquare : styles.recordCircle} /></Pressable>
          </View>
        </View>
      </Modal>
    </YStack>
  );
}

function PickerButton({ icon, label, onPress, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; compact?: boolean }) {
  return <XStack flex={compact ? undefined : 1} borderRadius="$md" borderWidth={1.5} borderColor="$borderColor" backgroundColor="$backgroundStrong" paddingHorizontal="$3" paddingVertical="$3" alignItems="center" gap="$2" onPress={onPress} accessibilityRole="button" accessibilityLabel={label}><Ionicons name={icon} size={18} color="#4F8266" /><Text>{label}</Text></XStack>;
}

const styles = StyleSheet.create({
  recorder: { flex: 1, backgroundColor: "#000000" },
  recorderHeader: { position: "absolute", top: 54, left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  recorderControls: { position: "absolute", left: 24, right: 24, bottom: 54, alignItems: "center", gap: 10 },
  recordButton: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 10 },
  recordButtonActive: { borderColor: "#F05555" },
  recordButtonDisabled: { opacity: 0.45 },
  recordCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#E84C4C" },
  stopSquare: { width: 30, height: 30, borderRadius: 5, backgroundColor: "#E84C4C" },
});
