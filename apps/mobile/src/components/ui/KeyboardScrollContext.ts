import { createContext, useContext } from "react";
import type { TextInput } from "react-native";

type ScrollFocusedInput = (input: TextInput | null) => void;

export const KeyboardScrollContext = createContext<ScrollFocusedInput>(() => undefined);

export function useKeyboardScroll() {
  return useContext(KeyboardScrollContext);
}

