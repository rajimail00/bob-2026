import { Ionicons } from "@expo/vector-icons";
import { YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { getCategoryIcon } from "../constants/categoryIcons";
import type { Category } from "../types/job.types";

interface CategoryTileProps {
  category: Category;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

/** Grid tile (icon over label) used in the post-a-job wizard and worker-profile category picker. */
export function CategoryTile({ category, label, isSelected, onPress }: CategoryTileProps) {
  return (
    <YStack
      borderRadius="$md"
      borderWidth={1.5}
      borderColor={isSelected ? "$primary" : "$borderColor"}
      backgroundColor={isSelected ? "$primary" : "$backgroundStrong"}
      paddingHorizontal="$3"
      paddingVertical="$4"
      width="31%"
      alignItems="center"
      justifyContent="center"
      gap="$2"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      pressStyle={{ opacity: 0.85 }}
    >
      <Ionicons name={getCategoryIcon(category.slug)} size={22} color={isSelected ? "white" : "#4F8266"} />
      <Text variant="small" fontWeight="600" color={isSelected ? "$primaryText" : "$color"} textAlign="center">
        {label}
      </Text>
    </YStack>
  );
}
