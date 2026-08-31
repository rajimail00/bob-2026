import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { JobDetailScreen } from "@/features/home/screens/JobDetailScreen";
import { ChatScreen } from "@/features/messages/screens/ChatScreen";
import { WorkerProfileSetupScreen } from "@/features/profile/screens/WorkerProfileSetupScreen";
import type { HomeStackParamList } from "./types";
import { ApplicantProfileScreen } from "@/features/applications/screens/ApplicantProfileScreen";
import { NotificationsScreen } from "@/features/notifications/screens/NotificationsScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="ApplicantProfile" component={ApplicantProfileScreen} options={{ headerShown: true, title: t("applications.profileTitle") }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: t("chat.title") }} />
      <Stack.Screen
        name="WorkerProfileSetup"
        component={WorkerProfileSetupScreen}
        options={{ headerShown: true, title: "Worker profile" }}
      />
    </Stack.Navigator>
  );
}
