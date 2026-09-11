import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, XStack } from "tamagui";
import { BobLogo } from "@/components/brand/BobLogo";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import type { MainTabParamList } from "@/navigation/types";

export function CustomerHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "BOB";

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
        <Pressable
          onPress={() => navigation.goBack()}
          role="button"
          aria-label={t("common.back")}
          style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={25} color="white" />
        </Pressable>
      ) : (
        <BobLogo size={48} />
      )}
      <Text variant="h3" color="white" flex={1} numberOfLines={1}>{title}</Text>
      {!showBack ? (
        <NotificationBell
          onBrand
          onPress={() => navigation.navigate("Home", { screen: "Notifications" })}
          label={(count) => t("notifications.bellLabel", { count })}
        />
      ) : null}
      <Pressable
        onPress={() => navigation.navigate("Profile", { screen: "ProfileAccount" })}
        role="button"
        aria-label={t("customerHeader.openAccount")}
        style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Circle size={42} backgroundColor="white" alignItems="center" justifyContent="center">
          <Avatar uri={user?.photoUrl} name={name} size={38} />
        </Circle>
      </Pressable>
    </XStack>
  );
}
import { Ionicons } from "@expo/vector-icons";
