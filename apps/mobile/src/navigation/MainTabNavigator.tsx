import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
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
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<MainTabParamList, keyof MainTabParamList> }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary?.val,
        tabBarInactiveTintColor: theme.colorMuted?.val,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name={ICON_BY_ROUTE[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Orders" component={OrdersStackNavigator} />
      <Tab.Screen name="Post" component={PostJobScreen} options={{ tabBarLabel: "Post" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
