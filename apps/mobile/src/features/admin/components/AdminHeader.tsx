import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAdminNotifications } from "../hooks/useAdmin";
import type { AdminStackParamList } from "@/navigation/types";
import { useTranslation } from "react-i18next";

export function AdminHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const notifications = useAdminNotifications();
  const unread = notifications.data?.unreadCount ?? 0;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin";

  return (
    <XStack
      backgroundColor="$primary"
      marginTop={-insets.top}
      paddingTop={insets.top + 12}
      paddingBottom="$3"
      paddingHorizontal="$4"
      minHeight={76 + insets.top}
      alignItems="center"
      gap="$3"
    >
      <StatusBar style="light" backgroundColor="#4F8266" />
      {showBack ? (
        <Pressable onPress={() => navigation.goBack()} role="button" aria-label={t("admin.accessibility.back")} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={25} color="white" />
        </Pressable>
      ) : (
        <Circle size={48} backgroundColor="white" alignItems="center" justifyContent="center">
          <Text variant="h2" color="$primary">β</Text>
        </Circle>
      )}
      <Text variant="h3" color="white" flex={1} numberOfLines={1}>{title}</Text>
      <Pressable onPress={() => navigation.navigate("AdminNotifications")} role="button" aria-label={t("admin.accessibility.notifications", { count: unread })} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Circle size={42} backgroundColor="white"><YStack flex={1} alignItems="center" justifyContent="center"><Ionicons name="notifications-outline" size={22} color="#4F8266" /></YStack></Circle>
        {unread > 0 ? <Circle position="absolute" right={0} top={0} size={18} backgroundColor="$danger"><Text variant="caption" color="white">{unread > 9 ? "9+" : unread}</Text></Circle> : null}
      </Pressable>
      <Pressable onPress={() => navigation.navigate("AdminAccount")} role="button" aria-label={t("admin.accessibility.account")} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Avatar uri={user?.photoUrl} name={name} size={42} />
      </Pressable>
    </XStack>
  );
}
