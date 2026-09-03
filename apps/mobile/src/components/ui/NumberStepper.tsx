import { Ionicons } from "@expo/vector-icons";
import { XStack } from "tamagui";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** The "− N +" stepper used for counts like people-needed — avoids a free-text number field. */
export function NumberStepper({ value, onChange, min = 1, max = 99 }: NumberStepperProps) {
  const { t } = useTranslation();
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <XStack
      borderRadius="$md"
      borderWidth={1.5}
      borderColor="$borderColor"
      backgroundColor="$backgroundStrong"
      height={52}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal="$3"
    >
      <XStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        onPress={() => canDecrease && onChange(value - 1)}
        opacity={canDecrease ? 1 : 0.35}
        role="button"
        aria-label={t("accessibility.decrease")}
      >
        <Ionicons name="remove" size={20} color="#4F8266" />
      </XStack>

      <Text variant="h4">{value}</Text>

      <XStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        onPress={() => canIncrease && onChange(value + 1)}
        opacity={canIncrease ? 1 : 0.35}
        role="button"
        aria-label={t("accessibility.increase")}
      >
        <Ionicons name="add" size={20} color="#4F8266" />
      </XStack>
    </XStack>
  );
}
