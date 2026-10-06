import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AuthStackParamList } from "@/navigation/types";
import { useForgotPassword, useResetPassword } from "../hooks/useAuthMutations";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from "../validation/auth.schema";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const [email, setEmail] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", password: "" },
  });

  const requestCode = emailForm.handleSubmit(async ({ email: requestedEmail }) => {
    setSubmitError(null);
    try {
      await forgotPassword.mutateAsync(requestedEmail);
      setEmail(requestedEmail.trim().toLowerCase());
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("common.genericError")));
    }
  });

  const submitReset = resetForm.handleSubmit(async (values) => {
    if (!email) return;
    setSubmitError(null);
    try {
      await resetPassword.mutateAsync({ email, ...values });
      setCompleted(true);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("auth.resetInvalid")));
    }
  });

  if (completed) {
    return (
      <Screen scroll>
        <YStack gap="$5" paddingTop="$6">
          <Text variant="h2">{t("auth.resetSuccessTitle")}</Text>
          <Text muted>{t("auth.resetSuccessBody")}</Text>
          <Button fullWidth onPress={() => navigation.navigate("Login")}>
            {t("auth.backToLogin")}
          </Button>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <YStack gap="$2">
          <Text variant="h2">{t("auth.forgotPasswordTitle")}</Text>
          <Text muted>{email ? t("auth.resetCodeSent") : t("auth.forgotPasswordBody")}</Text>
        </YStack>

        {!email ? (
          <Controller
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <Input
                label={t("auth.emailLabel")}
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={emailForm.formState.errors.email ? t(emailForm.formState.errors.email.message ?? "") : undefined}
              />
            )}
          />
        ) : (
          <YStack gap="$4">
            <Controller
              control={resetForm.control}
              name="code"
              render={({ field }) => (
                <Input
                  label={t("auth.resetCodeLabel")}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={resetForm.formState.errors.code ? t(resetForm.formState.errors.code.message ?? "") : undefined}
                />
              )}
            />
            <Controller
              control={resetForm.control}
              name="password"
              render={({ field }) => (
                <PasswordInput
                  label={t("auth.newPasswordLabel")}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={resetForm.formState.errors.password ? t(resetForm.formState.errors.password.message ?? "") : undefined}
                />
              )}
            />
          </YStack>
        )}

        {submitError ? <Text variant="small" color="$danger">{submitError}</Text> : null}

        <Button
          fullWidth
          onPress={email ? submitReset : requestCode}
          loading={forgotPassword.isPending || resetPassword.isPending}
        >
          {email ? t("auth.resetPassword") : t("auth.sendResetCode")}
        </Button>

        {email ? (
          <Text
            textAlign="center"
            color="$primary"
            fontWeight="700"
            onPress={() => {
              setEmail(null);
              setSubmitError(null);
              resetForm.reset();
            }}
          >
            {t("auth.useDifferentEmail")}
          </Text>
        ) : null}
      </YStack>
    </Screen>
  );
}
