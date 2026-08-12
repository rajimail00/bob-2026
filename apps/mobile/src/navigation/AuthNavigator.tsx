import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "@/features/auth/screens/LoginScreen";
import { RegisterScreen } from "@/features/auth/screens/RegisterScreen";
import { VerifyEmailScreen } from "@/features/auth/screens/VerifyEmailScreen";
import { WelcomeScreen } from "@/features/auth/screens/WelcomeScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: true, title: "" }} />
    </Stack.Navigator>
  );
}
