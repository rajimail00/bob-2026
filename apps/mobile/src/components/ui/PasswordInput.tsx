import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import { XStack } from "tamagui";
import { useTranslation } from "react-i18next";
import { Input, type InputProps } from "./Input";

/** Password field with a visibility-toggle eye icon — used anywhere a password is entered. */
export const PasswordInput = forwardRef<RNTextInput, Omit<InputProps, "secureTextEntry" | "rightElement">>(
  (props, ref) => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    return (
      <Input
        ref={ref}
        secureTextEntry={!isVisible}
        rightElement={
          <XStack
            padding="$2"
            onPress={() => setIsVisible((v) => !v)}
            role="button"
            aria-label={isVisible ? t("accessibility.hidePassword") : t("accessibility.showPassword")}
          >
            <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#5B6358" />
          </XStack>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";
