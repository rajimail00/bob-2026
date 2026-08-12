import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import type { AuthStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen background="brand">
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <YStack width={96} height={96} borderRadius={48} backgroundColor="$backgroundStrong" alignItems="center" justifyContent="center">
          <Text variant="display" color="$primary">
            B
          </Text>
        </YStack>
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
      </YStack>
    </Screen>
  );
}
