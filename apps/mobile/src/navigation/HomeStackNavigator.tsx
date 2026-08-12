import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { JobDetailScreen } from "@/features/home/screens/JobDetailScreen";
import { ChatScreen } from "@/features/messages/screens/ChatScreen";
import { WorkerProfileSetupScreen } from "@/features/profile/screens/WorkerProfileSetupScreen";
import type { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: "Messages" }} />
      <Stack.Screen
        name="WorkerProfileSetup"
        component={WorkerProfileSetupScreen}
        options={{ headerShown: true, title: "Worker profile" }}
      />
    </Stack.Navigator>
  );
}
