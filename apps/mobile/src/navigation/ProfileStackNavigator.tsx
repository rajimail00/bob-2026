import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { EditProfileScreen } from "@/features/profile/screens/EditProfileScreen";
import { ProfileCategoriesScreen } from "@/features/profile/screens/ProfileCategoriesScreen";
import { ProfileNotificationPreferencesScreen } from "@/features/profile/screens/ProfileNotificationPreferencesScreen";
import { ProfileAccountScreen } from "@/features/profile/screens/ProfileAccountScreen";
import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";
import { ProfileSettingsScreen } from "@/features/profile/screens/ProfileSettingsScreen";
import type { ProfileStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileOverview" component={ProfileScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="ProfileCategories" component={ProfileCategoriesScreen} />
      <Stack.Screen name="ProfileEdit" component={EditProfileScreen} />
      <Stack.Screen name="ProfileNotifications" component={ProfileNotificationPreferencesScreen} />
      <Stack.Screen name="ProfileAccount" component={ProfileAccountScreen} />
    </Stack.Navigator>
  );
}
