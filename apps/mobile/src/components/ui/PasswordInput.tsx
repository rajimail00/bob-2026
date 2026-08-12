import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import { XStack } from "tamagui";
import { Input, type InputProps } from "./Input";

/** Password field with a visibility-toggle eye icon — used anywhere a password is entered. */
export const PasswordInput = forwardRef<RNTextInput, Omit<InputProps, "secureTextEntry" | "rightElement">>(
  (props, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <Input
        ref={ref}
        secureTextEntry={!isVisible}
        rightElement={
          <XStack
            padding="$2"
            onPress={() => setIsVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isVisible ? "Hide password" : "Show password"}
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
