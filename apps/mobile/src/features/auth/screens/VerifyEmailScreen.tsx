import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AuthStackParamList } from "@/navigation/types";
import { useResendCode, useVerifyEmail } from "../hooks/useAuthMutations";
import { verifyEmailSchema, type VerifyEmailFormValues } from "../validation/auth.schema";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ route }: Props) {
  const { email } = route.params;
  const { t } = useTranslation();
  const verifyEmail = useVerifyEmail();
  const resendCode = useResendCode();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resendConfirmed, setResendConfirmed] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({ resolver: zodResolver(verifyEmailSchema), defaultValues: { code: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await verifyEmail.mutateAsync({ email, code: values.code });
      // RootNavigator now sees a token but no first/last name and routes to CreateProfile automatically.
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("auth.errors.codeInvalid")));
    }
  });

  const onResend = async () => {
    setResendConfirmed(false);
    await resendCode.mutateAsync(email);
    setResendConfirmed(true);
  };

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <Text variant="h2">{t("auth.verifyTitle")}</Text>
        <Text variant="body" muted>
          {t("auth.verifySubtitle")} ({email})
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <Input
              label={t("auth.verifyTitle")}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.code ? t(errors.code.message ?? "") : undefined}
              textAlign="center"
              style={{ fontSize: 24, letterSpacing: 8 }}
            />
          )}
        />

        {submitError ? (
          <Text variant="small" color="$danger">
            {submitError}
          </Text>
        ) : null}

        <Button onPress={onSubmit} loading={isSubmitting || verifyEmail.isPending} fullWidth>
          {t("common.continue")}
        </Button>

        <Button variant="ghost" onPress={onResend} loading={resendCode.isPending} fullWidth>
          {t("auth.resendCode")}
        </Button>
        {resendConfirmed ? (
          <Text variant="caption" textAlign="center">
            ✓
          </Text>
        ) : null}
      </YStack>
    </Screen>
  );
}
