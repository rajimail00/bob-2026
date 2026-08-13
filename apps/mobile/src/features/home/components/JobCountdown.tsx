import { useEffect, useState } from "react";
import { YStack } from "tamagui";
import { Text } from "@/components/ui/Text";

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface JobCountdownProps {
  targetDate: string;
}

/** Time-until-start display for an assigned job — ticks down to the scheduled date/time,
 * then flips to an "underway" state once it's passed. */
export function JobCountdown({ targetDate }: JobCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = new Date(targetDate).getTime() - now;
  const isUnderway = remainingMs <= 0;

  return (
    <YStack alignItems="center" gap="$1">
      <Text variant="label">{isUnderway ? "Job is underway" : "Job starts in"}</Text>
      {!isUnderway ? (
        <Text variant="display" color="$primary">
          {formatCountdown(remainingMs)}
        </Text>
      ) : null}
    </YStack>
  );
}
