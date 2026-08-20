import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { uploadAudio } from "@/features/media/api/media.api";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useApplyToJob } from "../hooks/useApplications";

interface ApplyFormProps {
  jobId: string;
  onApplied: () => void;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ApplyForm({ jobId, onApplied }: ApplyFormProps) {
  const [message, setMessage] = useState("");
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = useApplyToJob(jobId);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  // const player = useAudioPlayer(voiceNoteUri);
  const player = useAudioPlayer(voiceNoteUri, { updateInterval: 250 });
  const playerState = useAudioPlayerStatus(player);

function formatSeconds(secondsValue: number) {
  const totalSeconds = Math.max(0, Math.floor(secondsValue));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

  const uploadVoiceNote = async (uri: string) => {
    setIsUploadingVoice(true);
    try {
      const uploaded = await uploadAudio(uri);
      setVoiceNoteUrl(uploaded.url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't upload that voice note. You can retry or delete it."));
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    setVoiceNoteUri(null);
    setVoiceNoteUrl(null);
    player.pause();

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone access is off. Enable it in settings to record a voice note.");
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't start recording. Please try again."));
    }
  };

  const stopRecording = async () => {
    setError(null);

    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      if (!audioRecorder.uri) {
        setError("Couldn't save that recording. Please try again.");
        return;
      }

      setVoiceNoteUri(audioRecorder.uri);
      await uploadVoiceNote(audioRecorder.uri);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't stop recording. Please try again."));
    }
  };

  const retryVoiceUpload = async () => {
    if (!voiceNoteUri) return;
    setError(null);
    await uploadVoiceNote(voiceNoteUri);
  };

  const togglePlayback = async () => {
    if (!voiceNoteUri) return;

    try {
      if (playerState.playing) {
        player.pause();
        return;
      }

      if (playerState.didJustFinish) {
        await player.seekTo(0);
      }
      // if (playerState.didJustFinish || playerState.currentTime > 0) {
      //   await player.seekTo(0);
      // }
      player.play();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't play that voice note."));
    }
  };

  const removeVoiceNote = () => {
    player.pause();
    setVoiceNoteUri(null);
    setVoiceNoteUrl(null);
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    try {
      await apply.mutateAsync({
        message,
        ...(voiceNoteUrl ? { voiceNoteUrl } : {}),
      });
      onApplied();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't submit your application. Please try again."));
    }
  };

  const isRecording = recorderState.isRecording;
  const hasVoiceNote = Boolean(voiceNoteUri);
  const isVoicePending = hasVoiceNote && !voiceNoteUrl;
  const canSubmit = message.trim().length > 0 && !isRecording && !isUploadingVoice && !isVoicePending;
  const voiceDurationLabel = isRecording
    ? formatDuration(recorderState.durationMillis)
    : hasVoiceNote
      ? formatSeconds(playerState.currentTime)
      : "00:00";
  return (
    <YStack gap="$3">
      <Input
        placeholder="Tell them why you're a good fit…"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        style={{ height: 90, textAlignVertical: "top" }}
      />
      <VoiceNoteControls
        // durationLabel={isRecording ? formatDuration(recorderState.durationMillis) : "00:00"}
        durationLabel={voiceDurationLabel}
        hasVoiceNote={hasVoiceNote}
        isPlaying={playerState.playing}
        isRecording={isRecording}
        isUploading={isUploadingVoice}
        uploadFailed={Boolean(voiceNoteUri && !voiceNoteUrl && !isUploadingVoice)}
        onDelete={removeVoiceNote}
        onPlayPause={togglePlayback}
        onRetryUpload={retryVoiceUpload}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
      <Button onPress={onSubmit} loading={apply.isPending} disabled={!canSubmit} fullWidth>
        Apply
      </Button>
    </YStack>
  );
}

interface VoiceNoteControlsProps {
  durationLabel: string;
  hasVoiceNote: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  isUploading: boolean;
  uploadFailed: boolean;
  onDelete: () => void;
  onPlayPause: () => void;
  onRetryUpload: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function VoiceNoteControls({
  durationLabel,
  hasVoiceNote,
  isPlaying,
  isRecording,
  isUploading,
  uploadFailed,
  onDelete,
  onPlayPause,
  onRetryUpload,
  onStartRecording,
  onStopRecording,
}: VoiceNoteControlsProps) {
  const label = isRecording
    ? "Recording..."
    : uploadFailed
      ? "Upload failed"
      : hasVoiceNote
        ? "Voice note ready"
        : "Add voice note";

  return (
    <XStack
      minHeight={52}
      borderRadius="$pill"
      backgroundColor={isRecording ? "$danger" : "$primary"}
      paddingLeft="$4"
      paddingRight="$2"
      alignItems="center"
      gap="$3"
    >
      <Text variant="small" color="white" fontWeight="600" minWidth={42}>
        {durationLabel}
      </Text>
      <Text variant="small" color="white" fontWeight="600" flex={1} numberOfLines={1}>
        {label}
      </Text>

      {isUploading ? <ActivityIndicator color="white" /> : null}

      {uploadFailed ? (
        <CircleIconButton icon="refresh" label="Retry voice upload" onPress={onRetryUpload} />
      ) : hasVoiceNote ? (
        <>
          <CircleIconButton icon="trash" label="Delete voice note" onPress={onDelete} />
          <CircleIconButton icon={isPlaying ? "pause" : "play"} label={isPlaying ? "Pause voice note" : "Play voice note"} onPress={onPlayPause} />
        </>
      ) : (
        <CircleIconButton
          icon={isRecording ? "stop" : "mic"}
          label={isRecording ? "Stop voice recording" : "Start voice recording"}
          onPress={isRecording ? onStopRecording : onStartRecording}
        />
      )}
    </XStack>
  );
}

function CircleIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <XStack
      width={40}
      height={40}
      borderRadius={20}
      backgroundColor="$backgroundStrong"
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color="#4F8266" />
    </XStack>
  );
}
