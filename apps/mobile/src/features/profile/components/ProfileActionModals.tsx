import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState, type ReactNode } from "react";
import { Linking, Modal, Pressable, Share } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

const INVITE_URL = process.env.EXPO_PUBLIC_INVITE_URL?.trim() || "bob://";

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteFriendsModal({ visible, onClose }: ActionModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const inviteMessage = `${t("profileFlow.inviteMessage")} ${INVITE_URL}`;

  useEffect(() => {
    if (visible) setCopied(false);
  }, [visible]);

  const shareInvite = async (channel: "whatsapp" | "telegram") => {
    const shareUrl = channel === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`
      : `https://t.me/share/url?url=${encodeURIComponent(INVITE_URL)}&text=${encodeURIComponent(t("profileFlow.inviteMessage"))}`;

    try {
      await Linking.openURL(shareUrl);
    } catch {
      await Share.share({ message: inviteMessage });
    }
  };

  const copyInviteLink = async () => {
    await Clipboard.setStringAsync(INVITE_URL);
    setCopied(true);
  };

  return (
    <CenteredActionModal visible={visible} onClose={onClose} closeLabel={t("profileFlow.closeInvite")}>
      <Text variant="h3" textAlign="center">{t("profile.invite")}</Text>
      <XStack justifyContent="center" gap="$4">
        <ShareAction
          label={t("profileFlow.shareWhatsApp")}
          icon="logo-whatsapp"
          backgroundColor="#25D366"
          onPress={() => void shareInvite("whatsapp")}
        />
        <ShareAction
          label={t("profileFlow.shareTelegram")}
          icon="paper-plane"
          backgroundColor="#229ED9"
          onPress={() => void shareInvite("telegram")}
        />
        <ShareAction
          label={t("profileFlow.copyInviteLink")}
          icon="link"
          backgroundColor="#111111"
          onPress={() => void copyInviteLink()}
        />
      </XStack>
      {copied ? <Text color="$primary" textAlign="center">{t("profileFlow.inviteLinkCopied")}</Text> : null}
    </CenteredActionModal>
  );
}

export function FeedbackModal({ visible, onClose, onReview }: ActionModalProps & { onReview: () => void }) {
  const { t } = useTranslation();

  return (
    <CenteredActionModal visible={visible} onClose={onClose} closeLabel={t("profileFlow.closeFeedback")}>
      <Text variant="h3" textAlign="center" lineHeight={30}>{t("profileFlow.feedbackPrompt")}</Text>
      <Button fullWidth onPress={onReview}>{t("profileFlow.goToReview")}</Button>
    </CenteredActionModal>
  );
}

function CenteredActionModal({
  visible,
  onClose,
  closeLabel,
  children,
}: ActionModalProps & { closeLabel: string; children: ReactNode }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$5">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.58)" }}
        />
        <SafeAreaView style={{ width: "100%", maxWidth: 340 }} edges={["top", "bottom"]}>
          <YStack backgroundColor="$backgroundStrong" borderRadius="$xl" padding="$5" gap="$4" position="relative">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              style={{ position: "absolute", top: 4, right: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 1 }}
            >
              <Ionicons name="close" size={24} color="#2C312A" />
            </Pressable>
            {children}
          </YStack>
        </SafeAreaView>
      </YStack>
    </Modal>
  );
}

function ShareAction({
  label,
  icon,
  backgroundColor,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={30} color="white" />
    </Pressable>
  );
}
