import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, YStack } from "tamagui";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: "default" | "brand";
}

/** Base screen shell: safe area + optional scroll + keyboard avoidance. Every screen composes this instead of raw SafeAreaView. */
export function Screen({ children, scroll = false, padded = true, background = "default" }: ScreenProps) {
  const bg = background === "brand" ? "$primary" : "$background";

  const content = (
    <YStack flex={1} backgroundColor={bg} padding={padded ? "$4" : "$0"} gap="$4">
      {children}
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView flex={1} backgroundColor={bg} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
