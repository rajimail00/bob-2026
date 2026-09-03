import { Modal } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="rgba(0,0,0,0.35)" padding="$5">
        <YStack backgroundColor="$background" borderRadius="$lg" padding="$5" gap="$3" width="100%" maxWidth={340}>
          <Text variant="h4" textAlign="center">
            {t("problem.title")}
          </Text>

          <ReasonOption label={isOwner ? t("problem.workerUnavailable") : t("problem.cancel")} onPress={() => onSelectReason("cancel")} />
          <ReasonOption label={t("problem.addressNotFound")} onPress={() => onSelectReason("address_not_found")} />
          <ReasonOption label={t("problem.support")} onPress={() => onSelectReason("other")} />

          <Text
            variant="body"
            color="$colorMuted"
            textAlign="center"
            onPress={onClose}
            role="button"
            aria-label={t("problem.dismiss")}
          >
            {t("problem.dismiss")}
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
      role="button"
      aria-label={label}
    >
      <Text variant="body" color="$primary" fontWeight="600">
        {label}
      </Text>
    </YStack>
  );
}
