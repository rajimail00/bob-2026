import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { SubscriptionTier } from "@/features/auth/types/auth.types";

const PLAN_OPTIONS: SubscriptionTier[] = ["free", "pro", "unlimited"];

interface SubscriptionUpgradeModalProps {
  visible: boolean;
  currentTier: SubscriptionTier;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
}

export function SubscriptionUpgradeModal({
  visible,
  currentTier,
  onClose,
  onUpgrade,
}: SubscriptionUpgradeModalProps) {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);

  useEffect(() => {
    if (visible) setSelectedTier(currentTier);
  }, [currentTier, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("profileFlow.closeUpgradePlans")}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        />

        <SafeAreaView style={{ width: "100%", maxWidth: 360 }} edges={["top", "bottom"]}>
          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between" paddingLeft="$2">
              <Text variant="h3" color="white">{t("profileFlow.upgradePlansTitle")}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("profileFlow.closeUpgradePlans")}
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={28} color="white" />
              </Pressable>
            </XStack>

            {PLAN_OPTIONS.map((tier) => {
              const planName = `BOB-${t(`subscriptionTiers.${tier}`)}`;
              const selected = tier === selectedTier;

              return (
                <Pressable
                  key={tier}
                  onPress={() => setSelectedTier(tier)}
                  accessibilityRole="radio"
                  accessibilityLabel={t("profileFlow.choosePlan", { plan: planName })}
                  accessibilityState={{ selected }}
                >
                  <Card
                    minHeight={108}
                    alignItems="center"
                    justifyContent="center"
                    gap="$3"
                    borderRadius="$xl"
                    borderWidth={selected ? 3 : 1}
                    borderColor={selected ? "$primary" : "$borderColor"}
                    backgroundColor="$backgroundStrong"
                  >
                    <XStack alignItems="center" gap="$2">
                      <Text variant="h4">{planName}</Text>
                      {selected ? <Ionicons name="checkmark-circle" size={22} color="#4F8266" /> : null}
                    </XStack>
                    <Text muted textAlign="center">{t("profileFlow.planDetailsPending")}</Text>
                  </Card>
                </Pressable>
              );
            })}

            <Button fullWidth onPress={() => onUpgrade(selectedTier)}>
              {t("profileFlow.upgradeNow")}
            </Button>
          </YStack>
        </SafeAreaView>
      </YStack>
    </Modal>
  );
}
