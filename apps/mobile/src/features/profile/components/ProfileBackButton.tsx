import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

export function ProfileBackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={t("common.back")}
      hitSlop={10}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="chevron-back" size={28} color="#4F8266" />
    </Pressable>
  );
}
