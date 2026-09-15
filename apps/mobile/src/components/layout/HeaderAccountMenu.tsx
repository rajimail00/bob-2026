import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { color as colorToken } from "@/design/tokens";
import { useDeleteAccount, useLogout } from "@/features/auth/hooks/useAuthMutations";
import { getApiErrorMessage } from "@/lib/apiClient";

interface HeaderAccountMenuProps {
  visible: boolean;
  mode: "customer" | "admin";
  onClose: () => void;
}

export function HeaderAccountMenu({ visible, mode, onClose }: HeaderAccountMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const busy = logout.isPending || deleteAccount.isPending;

  const confirmAccountDeletion = () => {
    onClose();
    Alert.alert(t("profile.deactivateTitle"), t("profile.deactivateBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deactivateTitle"),
        style: "destructive",
        onPress: () => deleteAccount.mutate(undefined, {
          onError: (error) => Alert.alert(
            t("profile.deleteErrorTitle"),
            getApiErrorMessage(error, t("profile.deleteError")),
          ),
        }),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          testID="account-menu-backdrop"
        />
        <YStack
          position="absolute"
          top={insets.top + 64}
          right={16}
          width={240}
          backgroundColor="$backgroundStrong"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderColor"
          overflow="hidden"
          elevation={12}
          shadowColor="#000000"
          shadowOpacity={0.18}
          shadowRadius={14}
          shadowOffset={{ width: 0, height: 6 }}
        >
          <MenuAction
            label={t("common.logout")}
            icon="log-out-outline"
            disabled={busy}
            loading={logout.isPending}
            onPress={() => logout.mutate(undefined, { onSettled: onClose })}
          />
          {mode === "customer" ? (
            <>
              <View style={styles.divider} />
              <MenuAction
                label={t("profile.deactivateTitle")}
                icon="person-remove-outline"
                destructive
                disabled={busy}
                loading={deleteAccount.isPending}
                onPress={confirmAccountDeletion}
              />
            </>
          ) : null}
        </YStack>
      </View>
    </Modal>
  );
}

interface MenuActionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

function MenuAction({ label, icon, onPress, destructive = false, disabled = false, loading = false }: MenuActionProps) {
  const color = destructive ? colorToken.danger500 : colorToken.neutral800;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      aria-label={label}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}
    >
      <XStack minHeight={56} paddingHorizontal="$4" gap="$3" alignItems="center">
        {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={22} color={color} />}
        <Text color={color} fontWeight="600" flex={1}>{label}</Text>
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colorToken.neutral200,
  },
});
