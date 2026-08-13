import { Ionicons } from "@expo/vector-icons";
import { XStack } from "tamagui";
import { Text } from "@/components/ui/Text";

interface IconValueProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  muted?: boolean;
}

/** Icon + value pair used wherever a job's facts (budget, date, people…) are shown —
 * keeps the detail screen, review step, and cards speaking the same visual language. */
export function IconValue({ icon, value, muted }: IconValueProps) {
  return (
    <XStack alignItems="center" gap="$2">
      <Ionicons name={icon} size={16} color={muted ? "#9AA793" : "#4F8266"} />
      <Text variant={muted ? "caption" : "body"} color={muted ? "$colorMuted" : "$color"}>
        {value}
      </Text>
    </XStack>
  );
}
