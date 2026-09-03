import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { JobDetailScreen } from "@/features/home/screens/JobDetailScreen";
import { ChatScreen } from "@/features/messages/screens/ChatScreen";
import { OrdersScreen } from "@/features/orders/screens/OrdersScreen";
import { WorkerProfileSetupScreen } from "@/features/profile/screens/WorkerProfileSetupScreen";
import type { OrdersStackParamList } from "./types";
import { ApplicantProfileScreen } from "@/features/applications/screens/ApplicantProfileScreen";
import { PostJobScreen } from "@/features/orders/screens/PostJobScreen";

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen
        name="EditJob"
        component={PostJobScreen}
        options={{ headerShown: true, title: t("jobEditing.title") }}
      />
      <Stack.Screen
        name="RepostJob"
        component={PostJobScreen}
        options={{ headerShown: true, title: t("jobReposting.action") }}
      />
      <Stack.Screen name="ApplicantProfile" component={ApplicantProfileScreen} options={{ headerShown: true, title: t("applications.profileTitle") }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: t("chat.title") }} />
      <Stack.Screen
        name="WorkerProfileSetup"
        component={WorkerProfileSetupScreen}
        options={{ headerShown: true, title: t("workerProfile.title") }}
      />
    </Stack.Navigator>
  );
}
