import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { Circle, XStack, Input as TInput } from "tamagui";
import { useTranslation } from "react-i18next";

export function AdminSearchBar({
  value,
  onChangeText,
  placeholder,
  label,
  onOpenFilters,
  activeFilterCount = 0,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  label: string;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
}) {
  const { t } = useTranslation();
  return (
    <XStack marginHorizontal="$4" marginTop="$3" gap="$2" alignItems="center">
      <XStack flex={1} borderWidth={1.5} borderColor="$primary" borderRadius="$pill" alignItems="center" paddingHorizontal="$3" backgroundColor="$backgroundStrong" height={48}>
        <Ionicons name="search" size={21} color="#4F8266" />
        <TInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#78826F" aria-label={label} flex={1} height={44} borderWidth={0} backgroundColor="transparent" returnKeyType="search" />
        {value ? (
          <Pressable onPress={() => onChangeText("")} role="button" aria-label={t("admin.accessibility.clearSearch")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color="#78826F" />
          </Pressable>
        ) : null}
      </XStack>
      {onOpenFilters ? (
        <Pressable
          onPress={onOpenFilters}
          role="button"
          aria-label={t("filters.open")}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#4F8266",
          }}
        >
          <Ionicons name="options-outline" size={22} color="white" />
          {activeFilterCount > 0 ? (
            <Circle position="absolute" top={-5} right={-3} size={21} backgroundColor="$danger" alignItems="center" justifyContent="center">
              <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>{activeFilterCount > 9 ? "9+" : activeFilterCount}</Text>
            </Circle>
          ) : null}
        </Pressable>
      ) : null}
    </XStack>
  );
}
