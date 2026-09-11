import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";
import { ResponsiveTabLabel } from "@/components/navigation/ResponsiveTabLabel";
import type { AdminStackParamList, AdminTabParamList } from "./types";
import { AdminDashboardScreen } from "@/features/admin/screens/AdminDashboardScreen";
import { AdminUsersScreen } from "@/features/admin/screens/AdminUsersScreen";
import { AdminJobsScreen } from "@/features/admin/screens/AdminJobsScreen";
import { AdminTicketsScreen } from "@/features/admin/screens/AdminTicketsScreen";
import { AdminSettingsScreen } from "@/features/admin/screens/AdminSettingsScreen";
import { AdminUserDetailScreen } from "@/features/admin/screens/AdminUserDetailScreen";
import { AdminUserJobsScreen } from "@/features/admin/screens/AdminUserJobsScreen";
import { AdminJobDetailScreen } from "@/features/admin/screens/AdminJobDetailScreen";
import { AdminTicketDetailScreen } from "@/features/admin/screens/AdminTicketDetailScreen";
import { AdminCategoriesScreen } from "@/features/admin/screens/AdminCategoriesScreen";
import { AdminFaqsScreen } from "@/features/admin/screens/AdminFaqsScreen";
import { AdminConfigurationScreen } from "@/features/admin/screens/AdminConfigurationScreen";
import { AdminNotificationsScreen } from "@/features/admin/screens/AdminNotificationsScreen";
import { AdminAccountScreen } from "@/features/admin/screens/AdminAccountScreen";
import { AdminAdvertisementsScreen } from "@/features/admin/screens/AdminAdvertisementsScreen";
import { AdminAdvertisementFormScreen } from "@/features/admin/screens/AdminAdvertisementFormScreen";

const icons: Record<keyof AdminTabParamList, keyof typeof Ionicons.glyphMap> = { AdminDashboard: "grid-outline", AdminUsers: "people-outline", AdminJobs: "briefcase-outline", AdminTickets: "headset-outline", AdminSettings: "settings-outline" };
const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const labels: Record<keyof AdminTabParamList, string> = {
    AdminDashboard: t("admin.navigation.dashboard"),
    AdminUsers: t("admin.navigation.users"),
    AdminJobs: t("admin.navigation.jobs"),
    AdminTickets: t("admin.navigation.tickets"),
    AdminSettings: t("admin.navigation.settings"),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<AdminTabParamList, keyof AdminTabParamList> }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.primary?.val,
        tabBarInactiveTintColor: theme.colorMuted?.val,
        tabBarStyle: {
          height: 62 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabel: ({ color }: { color: string }) => (
          <ResponsiveTabLabel label={labels[route.name]} color={color} maxWidth={68} />
        ),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
      />
      <Tab.Screen
        name="AdminJobs"
        component={AdminJobsScreen}
      />
      <Tab.Screen
        name="AdminTickets"
        component={AdminTicketsScreen}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
      />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AdminTabs" component={AdminTabs} /><Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} /><Stack.Screen name="AdminUserJobs" component={AdminUserJobsScreen} /><Stack.Screen name="AdminJobDetail" component={AdminJobDetailScreen} /><Stack.Screen name="AdminTicketDetail" component={AdminTicketDetailScreen} /><Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} /><Stack.Screen name="AdminFaqs" component={AdminFaqsScreen} /><Stack.Screen name="AdminAdvertisements" component={AdminAdvertisementsScreen} /><Stack.Screen name="AdminAdvertisementForm" component={AdminAdvertisementFormScreen} /><Stack.Screen name="AdminConfiguration" component={AdminConfigurationScreen} /><Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} /><Stack.Screen name="AdminAccount" component={AdminAccountScreen} /></Stack.Navigator>;
}
