import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";
import { PostJobScreen } from "@/features/orders/screens/PostJobScreen";
import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";
import { HomeStackNavigator } from "./HomeStackNavigator";
import { OrdersStackNavigator } from "./OrdersStackNavigator";
import type { MainTabParamList } from "./types";

const ICON_BY_ROUTE: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "map-outline",
  Orders: "copy-outline",
  Post: "add-circle",
  Profile: "person-outline",
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<MainTabParamList, keyof MainTabParamList> }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.primary?.val,
        tabBarInactiveTintColor: theme.colorMuted?.val,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name={ICON_BY_ROUTE[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: t("navigation.home") }} />
      <Tab.Screen name="Orders" component={OrdersStackNavigator} options={{ tabBarLabel: t("navigation.orders") }} />
      <Tab.Screen name="Post" component={PostJobScreen} options={{ tabBarLabel: t("navigation.post") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("navigation.profile") }} />
    </Tab.Navigator>
  );
}
