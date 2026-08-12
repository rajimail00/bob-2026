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
import { useCompleteProfile } from "../hooks/useAuthMutations";
import { createProfileSchema, type CreateProfileFormValues } from "../validation/auth.schema";

/** Reached once a user has a verified session but hasn't set first/last name yet — RootNavigator gates on this. */
export function CreateProfileScreen() {
  const { t } = useTranslation();
  const completeProfile = useCompleteProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfileFormValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await completeProfile.mutateAsync(values);
      // RootNavigator now sees a fully-set-up user and routes to the main tabs automatically.
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("auth.errors.firstNameRequired")));
    }
  });

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <Text variant="h2">{t("auth.createProfileTitle")}</Text>

        <YStack gap="$4">
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                label={t("auth.firstNameLabel")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.firstName ? t(errors.firstName.message ?? "") : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input
                label={t("auth.lastNameLabel")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.lastName ? t(errors.lastName.message ?? "") : undefined}
              />
            )}
          />
        </YStack>

        {submitError ? (
          <Text variant="small" color="$danger">
            {submitError}
          </Text>
        ) : null}

        <Button onPress={onSubmit} loading={isSubmitting || completeProfile.isPending} fullWidth>
          {t("common.continue")}
        </Button>
      </YStack>
    </Screen>
  );
}
