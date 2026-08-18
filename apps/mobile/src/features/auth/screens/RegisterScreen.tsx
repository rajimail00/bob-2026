import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import { setAppLocale, type SupportedLocale } from "@/lib/i18n";
import type { AuthStackParamList } from "@/navigation/types";
import { useRegister } from "../hooks/useAuthMutations";
import { registerSchema, type RegisterFormValues } from "../validation/auth.schema";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const LANGUAGES: Array<{
  code: SupportedLocale;
  label: string;
  flag: string;
}> = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
];

export function RegisterScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const register = useRegister();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLocale | null>(null);

  const selectedLanguageDetails = LANGUAGES.find(
    (language) => language.code === selectedLanguage
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const locale =
        selectedLanguage ??
        ((i18n.language?.slice(0, 2) as SupportedLocale) || "en");
      await register.mutateAsync({ ...values, locale });
      navigation.navigate("VerifyEmail", { email: values.email });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, t("common.genericError")));
    }
  });

  return (
    <Screen scroll>
      <YStack gap="$5" paddingTop="$6">
        <Text variant="h2">{t("auth.registerTitle")}</Text>

        <YStack gap="$4">
          <YStack gap="$2">
            <XStack
              height={52}
              paddingHorizontal="$4"
              alignItems="center"
              justifyContent="space-between"
              borderWidth={1.5}
              borderColor="$borderColor"
              borderRadius="$md"
              backgroundColor="$backgroundStrong"
              onPress={() => setIsLanguageOpen((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel="Select language"
            >
              <Text variant="body" muted={!selectedLanguageDetails}>
                {selectedLanguageDetails?.label ?? "Select Language"}
              </Text>

              <Ionicons
                name={isLanguageOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#6B7280"
              />
            </XStack>

            {isLanguageOpen ? (
              <YStack
                borderWidth={1.5}
                borderColor="$borderColor"
                borderRadius="$md"
                backgroundColor="$backgroundStrong"
                overflow="hidden"
              >
                {LANGUAGES.map((language) => (
                  <XStack
                    key={language.code}
                    height={48}
                    paddingHorizontal="$4"
                    alignItems="center"
                    gap="$3"
                    borderBottomWidth={1}
                    borderBottomColor="$borderColor"
                    onPress={() => {
                      setSelectedLanguage(language.code);
                      setAppLocale(language.code);
                      setIsLanguageOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${language.label}`}
                  >
                    <Text fontSize={24}>{language.flag}</Text>
                    <Text variant="body">{language.label}</Text>
                  </XStack>
                ))}
              </YStack>
            ) : null}
          </YStack>
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

        <Button onPress={onSubmit} loading={isSubmitting || register.isPending} fullWidth>
          {t("common.continue")}
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text variant="body" muted>
            {t("auth.haveAccount")}
          </Text>
          <Text variant="body" color="$primary" fontWeight="700" onPress={() => navigation.navigate("Login")}>
            {t("auth.login")}
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
