import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useTranslation } from "react-i18next";

export type AdminActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function AdminActiveFilters({ filters }: { filters: AdminActiveFilter[] }) {
  const { t } = useTranslation();
  if (filters.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 10 }}
    >
      {filters.map((filter) => (
        <Pressable
          key={filter.key}
          onPress={filter.onRemove}
          role="button"
          aria-label={`${t("filters.clear")}: ${filter.label}`}
          style={{
            minHeight: 36,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#4F8266",
            backgroundColor: "#E8F1EC",
          }}
        >
          <Text color="$primary" numberOfLines={1}>{filter.label}</Text>
          <Ionicons name="close" size={16} color="#4F8266" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function AdminFilterSheet({
  visible,
  onClose,
  onClear,
  hasActiveFilters = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <YStack flex={1} justifyContent="flex-end">
        <Pressable
          onPress={onClose}
          aria-label={t("common.cancel")}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
        />
        <SafeAreaView edges={["bottom"]} style={{ maxHeight: "84%", minHeight: "48%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <YStack flexShrink={1} paddingTop="$4" paddingHorizontal="$4" paddingBottom="$3" gap="$3">
            <XStack alignItems="center" justifyContent="space-between">
              <Text variant="h3">{t("filters.title")}</Text>
              <Pressable onPress={onClose} role="button" aria-label={t("filters.done")} hitSlop={10} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={26} color="#2C312A" />
              </Pressable>
            </XStack>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
              {children}
            </ScrollView>
            <XStack gap="$2">
              {hasActiveFilters && onClear ? <Button flex={1} variant="outline" onPress={onClear}>{t("filters.clear")}</Button> : null}
              <Button flex={1} onPress={onClose}>{t("filters.done")}</Button>
            </XStack>
          </YStack>
        </SafeAreaView>
      </YStack>
    </Modal>
  );
}

export function AdminFilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack gap="$2">
      <Text variant="caption">{title}</Text>
      {children}
    </YStack>
  );
}
