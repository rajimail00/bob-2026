import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import type { TextInput as RNTextInput, TextInputProps } from "react-native";
import { Input as TamaguiInput, XStack, YStack } from "tamagui";
import { Text } from "./Text";
import { useKeyboardScroll } from "./KeyboardScrollContext";

// Tamagui 1.144's GetProps<typeof Input> doesn't resolve to the full prop set under
// React 19 types (drops plain RN TextInput props), so this is typed off RN's own
// TextInputProps instead, plus the handful of Tamagui style props this app actually passes through.
export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  /** Absolutely-positioned accessory on the right edge, e.g. a password-visibility toggle. */
  rightElement?: ReactNode;
}

/** The single text-input component. Pairs with react-hook-form via the ref + onChangeText/onBlur pattern. */
export const Input = forwardRef<RNTextInput, InputProps>(
  ({ label, error, helperText, rightElement, onFocus, ...rest }, ref) => {
    const inputRef = useRef<RNTextInput>(null);
    const scrollFocusedInput = useKeyboardScroll();
    useImperativeHandle(ref, () => inputRef.current as RNTextInput);

    return (
      <YStack gap="$2">
        {label ? <Text variant="label">{label}</Text> : null}
        <XStack alignItems="center">
          <TamaguiInput
            ref={inputRef}
            flex={1}
            borderRadius="$md"
            borderWidth={1.5}
            borderColor={error ? "$danger" : "$borderColor"}
            backgroundColor="$backgroundStrong"
            height={52}
            paddingHorizontal="$4"
            paddingRight={rightElement ? "$8" : "$4"}
            fontSize="$3"
            placeholderTextColor="$colorMuted"
            onFocus={(event) => {
              scrollFocusedInput(inputRef.current);
              onFocus?.(event);
            }}
            {...rest}
          />
          {rightElement ? (
            <XStack position="absolute" right="$1" height={52} alignItems="center" justifyContent="center">
              {rightElement}
            </XStack>
          ) : null}
        </XStack>
        {error ? (
          <Text variant="small" color="$danger">
            {error}
          </Text>
        ) : helperText ? (
          <Text variant="caption">{helperText}</Text>
        ) : null}
      </YStack>
    );
  }
);

Input.displayName = "Input";
