import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { AdminHeader } from "../components/AdminHeader";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

const rows = [
  { route: "AdminCategories" as const, icon: "create-outline" as const, translationKey: "admin.settings.categories" },
  { route: "AdminFaqs" as const, icon: "help-circle-outline" as const, translationKey: "admin.settings.faqs" },
  { route: "AdminAdvertisements" as const, icon: "megaphone-outline" as const, translationKey: "admin.advertisements.title" },
  { route: "AdminConfiguration" as const, icon: "settings-outline" as const, translationKey: "admin.settings.configuration" },
];
export function AdminSettingsScreen() {
  const { t } = useTranslation(); const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  return <Screen padded={false} safeAreaEdges={["top", "left", "right"]}><AdminHeader title={t("admin.navigation.settings")} /><YStack padding="$4" gap="$4"><Card elevated padding="$2"><Text variant="h4" padding="$3">{t("admin.settings.title")}</Text>{rows.map((row) => <Pressable key={row.route} onPress={() => navigation.navigate(row.route)} role="button" aria-label={t(row.translationKey)}><XStack minHeight={66} alignItems="center" paddingHorizontal="$3" gap="$3" borderTopWidth={1} borderColor="$borderColor"><Ionicons name={row.icon} size={25} color="#4F8266" /><Text variant="bodyLg" flex={1}>{t(row.translationKey)}</Text><Ionicons name="chevron-forward" size={22} color="#5B6358" /></XStack></Pressable>)}</Card></YStack></Screen>;
}
