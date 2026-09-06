import { Ionicons } from "@expo/vector-icons";
import { XStack, Input as TInput } from "tamagui";
import { useTranslation } from "react-i18next";

export function AdminSearchBar({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (value: string) => void; placeholder: string; label: string }) {
  const { t } = useTranslation();
  return (
    <XStack marginHorizontal="$4" marginVertical="$3" borderWidth={1.5} borderColor="$primary" borderRadius="$pill" alignItems="center" paddingHorizontal="$3" backgroundColor="$backgroundStrong">
      <Ionicons name="search" size={21} color="#4F8266" />
      <TInput value={value} onChangeText={onChangeText} placeholder={placeholder} aria-label={label} flex={1} borderWidth={0} backgroundColor="transparent" returnKeyType="search" />
      {value ? <Ionicons name="close-circle" size={20} color="#78826F" onPress={() => onChangeText("")} accessibilityLabel={t("admin.accessibility.clearSearch")} /> : null}
    </XStack>
  );
}
