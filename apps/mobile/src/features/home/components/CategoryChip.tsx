import { Ionicons } from "@expo/vector-icons";
import { XStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { getCategoryIcon } from "../constants/categoryIcons";
import type { Category } from "../types/job.types";

interface CategoryChipProps {
  category: Category;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

/** Pill-shaped category chip used in horizontally-scrolling filter rows. */
export function CategoryChip({ category, label, isSelected, onPress }: CategoryChipProps) {
  return (
    <XStack
      borderRadius="$pill"
      borderWidth={1.5}
      borderColor={isSelected ? "$primary" : "$borderColor"}
      backgroundColor={isSelected ? "$primary" : "$backgroundStrong"}
      paddingHorizontal="$4"
      paddingVertical="$2"
      alignItems="center"
      gap="$2"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      pressStyle={{ opacity: 0.85 }}
    >
      <Ionicons name={getCategoryIcon(category.slug)} size={16} color={isSelected ? "white" : "#4F8266"} />
      <Text variant="small" fontWeight="600" color={isSelected ? "$primaryText" : "$color"}>
        {label}
      </Text>
    </XStack>
  );
}
