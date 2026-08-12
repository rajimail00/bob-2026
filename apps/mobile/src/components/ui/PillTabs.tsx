import { Text as TamaguiText, XStack } from "tamagui";

export interface PillTabOption<T extends string> {
  value: T;
  label: string;
}

interface PillTabsProps<T extends string> {
  options: PillTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** The green/white segmented control from the mockups (e.g. "Meine Aufträge / Meine Jobs", "Karte / Liste"). */
export function PillTabs<T extends string>({ options, value, onChange }: PillTabsProps<T>) {
  return (
    <XStack borderRadius="$pill" borderWidth={1.5} borderColor="$primary" padding={3} backgroundColor="$backgroundStrong">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <XStack
            key={option.value}
            flex={1}
            paddingVertical="$2"
            alignItems="center"
            justifyContent="center"
            borderRadius="$pill"
            backgroundColor={isActive ? "$primary" : "transparent"}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            pressStyle={{ opacity: 0.85 }}
          >
            <TamaguiText
              fontFamily="$heading"
              fontWeight="700"
              fontSize="$2"
              color={isActive ? "$primaryText" : "$primary"}
            >
              {option.label}
            </TamaguiText>
          </XStack>
        );
      })}
    </XStack>
  );
}
