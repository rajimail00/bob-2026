import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Text } from "@/components/ui/Text";
import type { SupportedLocale } from "@/lib/i18n";
import { CategoryTile } from "./CategoryTile";
import type { Category } from "../types/job.types";

const MAX_BUDGET = 1000;
const MAX_PEOPLE = 15;

export interface JobFilters {
  categoryId: string | null;
  minBudget: number;
  maxBudget: number;
  peopleNeeded: number | null;
}

interface JobFilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  onClear: () => void;
}

export function JobFilterModal({ visible, onClose, categories, filters, onChange, onClear }: JobFilterModalProps) {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.35)">
        <YStack backgroundColor="$background" borderTopLeftRadius="$lg" borderTopRightRadius="$lg" padding="$4" gap="$5" maxHeight="85%">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="h3">Filters</Text>
            <Text variant="body" color="$primary" onPress={onClose}>
              Done
            </Text>
          </XStack>

          <YStack gap="$3">
            <Text variant="label">Category</Text>
            <XStack flexWrap="wrap" gap="$2">
              {categories.map((category) => (
                <CategoryTile
                  key={category._id}
                  category={category}
                  label={category.name[locale] ?? category.name.en}
                  isSelected={filters.categoryId === category._id}
                  onPress={() =>
                    onChange({
                      ...filters,
                      categoryId: filters.categoryId === category._id ? null : category._id,
                    })
                  }
                />
              ))}
            </XStack>
          </YStack>

          <YStack gap="$3">
            <XStack justifyContent="space-between">
              <Text variant="label">Budget</Text>
              <Text variant="caption">
                €{filters.minBudget} – €{filters.maxBudget}
              </Text>
            </XStack>
            <YStack gap="$1">
              <Text variant="caption" muted>
                Min
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={MAX_BUDGET}
                step={5}
                value={filters.minBudget}
                onSlidingComplete={(v) => onChange({ ...filters, minBudget: Math.min(v, filters.maxBudget) })}
                minimumTrackTintColor="#4F8266"
                maximumTrackTintColor="#DDE3DA"
                thumbTintColor="#4F8266"
              />
            </YStack>
            <YStack gap="$1">
              <Text variant="caption" muted>
                Max
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={MAX_BUDGET}
                step={5}
                value={filters.maxBudget}
                onSlidingComplete={(v) => onChange({ ...filters, maxBudget: Math.max(v, filters.minBudget) })}
                minimumTrackTintColor="#4F8266"
                maximumTrackTintColor="#DDE3DA"
                thumbTintColor="#4F8266"
              />
            </YStack>
          </YStack>

          <YStack gap="$2">
            <Text variant="label">People needed</Text>
            <NumberStepper
              value={filters.peopleNeeded ?? 1}
              onChange={(v) => onChange({ ...filters, peopleNeeded: v })}
              min={1}
              max={MAX_PEOPLE}
            />
          </YStack>

          <Button variant="destructive" onPress={onClear}>
            Clear filters
          </Button>
        </YStack>
      </YStack>
    </Modal>
  );
}
