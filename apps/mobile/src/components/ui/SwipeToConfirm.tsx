import Slider from "@react-native-community/slider";
import { useState } from "react";
import { YStack } from "tamagui";
import { Text } from "./Text";

interface SwipeToConfirmProps {
  label: string;
  onConfirm: () => void;
  loading?: boolean;
}

const CONFIRM_THRESHOLD = 92;

/** Drag-to-confirm control for hard-to-undo actions (completing a job) — a deliberate motion
 * instead of a single tap, so it can't be triggered by accident. */
export function SwipeToConfirm({ label, onConfirm, loading = false }: SwipeToConfirmProps) {
  const [value, setValue] = useState(0);

  return (
    <YStack borderRadius="$pill" backgroundColor="$primary" height={52} justifyContent="center" opacity={loading ? 0.6 : 1}>
      <Text variant="body" color="$primaryText" textAlign="center" fontWeight="600">
        {loading ? "Completing…" : label}
      </Text>
      <Slider
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        minimumValue={0}
        maximumValue={100}
        value={value}
        disabled={loading}
        onValueChange={setValue}
        onSlidingComplete={(v) => {
          if (v >= CONFIRM_THRESHOLD) onConfirm();
          setValue(0);
        }}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor="white"
      />
    </YStack>
  );
}
