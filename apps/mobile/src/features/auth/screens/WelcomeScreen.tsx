import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { BobLogo } from "@/components/brand/BobLogo";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { PRIVACY_POLICY_URL } from "@/lib/externalLinks";
import type { AuthStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen background="brand">
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <BobLogo size={96} />
        <Text variant="h2" color="$primaryText" marginTop="$4">
          {t("auth.welcome")}
        </Text>
        <Text variant="body" color="$primaryText" opacity={0.85} textAlign="center">
          {t("auth.tagline")}
        </Text>
      </YStack>

      <YStack gap="$3" paddingBottom="$4">
        <Button variant="inverse" fullWidth onPress={() => navigation.navigate("Login")}>
          {t("auth.login")}
        </Button>
        <Button variant="outlineInverse" fullWidth onPress={() => navigation.navigate("Register")}>
          {t("auth.register")}
        </Button>
        <Pressable
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          role="link"
          accessibilityLabel={t("profile.privacyPolicy")}
          style={{ alignSelf: "center", paddingVertical: 4 }}
        >
          <Text variant="caption" color="$primaryText" textDecorationLine="underline">
            {t("profile.privacyPolicy")}
          </Text>
        </Pressable>
      </YStack>
    </Screen>
  );
}
