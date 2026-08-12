import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AuthStackParamList } from "@/navigation/types";
import { useLogin } from "../hooks/useAuthMutations";
import { loginSchema, type LoginFormValues } from "../validation/auth.schema";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const login = useLogin();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login.mutateAsync(values);
      // RootNavigator reacts to the token/user in the store and swaps stacks automatically.
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("common.genericError")));
    }
  });

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <Text variant="h2">{t("auth.loginTitle")}</Text>

        <YStack gap="$4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                label={t("auth.emailLabel")}
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email ? t(errors.email.message ?? "") : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                label={t("auth.passwordLabel")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password ? t(errors.password.message ?? "") : undefined}
              />
            )}
          />
        </YStack>

        {submitError ? (
          <Text variant="small" color="$danger">
            {submitError}
          </Text>
        ) : null}

        <Button onPress={onSubmit} loading={isSubmitting || login.isPending} fullWidth>
          {t("common.continue")}
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text variant="body" muted>
            {t("auth.noAccount")}
          </Text>
          <Text variant="body" color="$primary" fontWeight="700" onPress={() => navigation.navigate("Register")}>
            {t("auth.register")}
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
