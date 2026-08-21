import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { JobDetailScreen } from "@/features/home/screens/JobDetailScreen";
import { ChatScreen } from "@/features/messages/screens/ChatScreen";
import { OrdersScreen } from "@/features/orders/screens/OrdersScreen";
import { WorkerProfileSetupScreen } from "@/features/profile/screens/WorkerProfileSetupScreen";
import type { OrdersStackParamList } from "./types";
import { ApplicantProfileScreen } from "@/features/applications/screens/ApplicantProfileScreen";

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="ApplicantProfile" component={ApplicantProfileScreen} options={{ headerShown: true, title: "Applicant Profile",}} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: "Messages" }} />
      <Stack.Screen
        name="WorkerProfileSetup"
        component={WorkerProfileSetupScreen}
        options={{ headerShown: true, title: "Worker profile" }}
      />
    </Stack.Navigator>
  );
}
