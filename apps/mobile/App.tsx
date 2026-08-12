import "@/lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "tamagui";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useAuthStore } from "@/features/auth/store/authStore";
import { queryClient } from "@/lib/queryClient";
import tamaguiConfig from "./tamagui.config";

export default function App() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setIsReady(true));
  }, [hydrate]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme === "dark" ? "dark" : "light"}>
          <QueryClientProvider client={queryClient}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <RootNavigator />
          </QueryClientProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
