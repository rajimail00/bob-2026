import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";
import { ResponsiveTabLabel } from "@/components/navigation/ResponsiveTabLabel";
import { PostJobScreen } from "@/features/orders/screens/PostJobScreen";
import { HomeStackNavigator } from "./HomeStackNavigator";
import { OrdersStackNavigator } from "./OrdersStackNavigator";
import { ProfileStackNavigator } from "./ProfileStackNavigator";
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
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  const labels: Record<keyof MainTabParamList, string> = {
    Home: t("navigation.home"),
    Orders: t("navigation.orders"),
    Post: t("navigation.post"),
    Profile: t("navigation.profile"),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<MainTabParamList, keyof MainTabParamList> }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.primary?.val,
        tabBarInactiveTintColor: theme.colorMuted?.val,
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarItemStyle: { paddingHorizontal: 2 },
        tabBarLabel: ({ color }: { color: string }) => (
          <ResponsiveTabLabel label={labels[route.name]} color={color} maxWidth={88} />
        ),
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name={ICON_BY_ROUTE[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Orders" component={OrdersStackNavigator} />
      <Tab.Screen name="Post" component={PostJobScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
