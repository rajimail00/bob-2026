import { useTranslation } from "react-i18next";
import { ScrollView, XStack } from "tamagui";
import type { SupportedLocale } from "@/lib/i18n";
import { CategoryChip } from "./CategoryChip";
import type { Category } from "../types/job.types";

interface CategoryFilterRowProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilterRow({ categories, selectedId, onSelect }: CategoryFilterRowProps) {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2" paddingVertical="$1">
        {categories.map((category) => {
          const isActive = category._id === selectedId;
          return (
            <CategoryChip
              key={category._id}
              category={category}
              label={category.name[locale] ?? category.name.en}
              isSelected={isActive}
              onPress={() => onSelect(isActive ? null : category._id)}
            />
          );
        })}
      </XStack>
    </ScrollView>
  );
}
