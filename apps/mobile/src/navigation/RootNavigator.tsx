import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CreateProfileScreen } from "@/features/auth/screens/CreateProfileScreen";
import { useMe } from "@/features/auth/hooks/useMe";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import type { RootStackParamList } from "./types";
import { useNotificationEvents } from "@/features/notifications/hooks/useNotificationEvents";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthenticatedApp() {
  useNotificationEvents();
  return <MainTabNavigator />;
}

function AuthenticatedProfileSetup() {
  useNotificationEvents();
  return <CreateProfileScreen />;
}

/**
 * Single source of truth for which stack the app shows:
 * no session -> Auth; session but no first/last name yet -> CreateProfile; otherwise -> Main tabs.
 * This is the in-app equivalent of role/route guarding — screens never decide this themselves.
 */
export function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user, isLoading: isMeLoading } = useMe();

  if (!isHydrated || (accessToken && isMeLoading)) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const hasSession = Boolean(accessToken && user);
  const hasCompletedProfile = Boolean(user?.firstName && user?.lastName);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSession ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !hasCompletedProfile ? (
          <Stack.Screen name="CreateProfile" component={AuthenticatedProfileSetup} />
        ) : (
          <Stack.Screen name="Main" component={AuthenticatedApp} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
