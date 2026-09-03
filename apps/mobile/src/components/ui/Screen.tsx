import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { KeyboardScrollContext } from "./KeyboardScrollContext";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: "default" | "brand";
}

/** Base screen shell: safe area + optional scroll + keyboard avoidance. Every screen composes this instead of raw SafeAreaView. */
export function Screen({ children, scroll = false, padded = true, background = "default" }: ScreenProps) {
  const bg = background === "brand" ? "$primary" : "$background";
  const scrollRef = useRef<ScrollView>(null);
  const focusScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollFocusedInput = useCallback((input: TextInput | null) => {
    if (!input || !scrollRef.current) return;
    if (focusScrollTimeout.current) clearTimeout(focusScrollTimeout.current);

    focusScrollTimeout.current = setTimeout(
      () => {
        const inputHandle = findNodeHandle(input);
        if (inputHandle === null) return;
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
          inputHandle,
          24,
          true
        );
      },
      Platform.OS === "ios" ? 250 : 180
    );
  }, []);

  useEffect(
    () => () => {
      if (focusScrollTimeout.current) clearTimeout(focusScrollTimeout.current);
    },
    []
  );

  const content = (
    <YStack flex={1} backgroundColor={bg} padding={padded ? "$4" : "$0"} gap="$4">
      {children}
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <KeyboardScrollContext.Provider value={scrollFocusedInput}>
          {scroll ? (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardScrollContext.Provider>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
