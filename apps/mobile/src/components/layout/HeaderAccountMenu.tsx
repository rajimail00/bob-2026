import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { color as colorToken } from "@/design/tokens";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";

interface HeaderAccountMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function HeaderAccountMenu({ visible, onClose }: HeaderAccountMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logout = useLogout();

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
            disabled={logout.isPending}
            loading={logout.isPending}
            onPress={() => logout.mutate(undefined, { onSettled: onClose })}
          />
        </YStack>
      </View>
    </Modal>
  );
}

interface MenuActionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function MenuAction({ label, icon, onPress, disabled = false, loading = false }: MenuActionProps) {
  const color = colorToken.neutral800;

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
});
