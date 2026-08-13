import { Modal } from "react-native";
import { YStack } from "tamagui";
import { Text } from "@/components/ui/Text";

export type ProblemReason = "cancel" | "address_not_found" | "no_show" | "other";

interface ReportProblemModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectReason: (reason: ProblemReason) => void;
  /** The job owner sees "worker didn't show up" instead of "I need to cancel". */
  isOwner: boolean;
}

/** Centered "what's wrong?" prompt — the entry point into cancelling, flagging a bad address,
 * or reaching support, all as one lightweight problem report. */
export function ReportProblemModal({ visible, onClose, onSelectReason, isOwner }: ReportProblemModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="rgba(0,0,0,0.35)" padding="$5">
        <YStack backgroundColor="$background" borderRadius="$lg" padding="$5" gap="$3" width="100%" maxWidth={340}>
          <Text variant="h4" textAlign="center">
            What's wrong with this job?
          </Text>

          <ReasonOption label={isOwner ? "The worker can't make it" : "I need to cancel"} onPress={() => onSelectReason("cancel")} />
          <ReasonOption label="Address not found" onPress={() => onSelectReason("address_not_found")} />
          <ReasonOption label="Contact support" onPress={() => onSelectReason("other")} />

          <Text variant="body" color="$colorMuted" textAlign="center" onPress={onClose}>
            Never mind
          </Text>
        </YStack>
      </YStack>
    </Modal>
  );
}

function ReasonOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <YStack
      borderWidth={1.5}
      borderColor="$primary"
      borderRadius="$pill"
      paddingVertical="$3"
      alignItems="center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text variant="body" color="$primary" fontWeight="600">
        {label}
      </Text>
    </YStack>
  );
}
