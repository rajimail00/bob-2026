import { useEffect, useState } from "react";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminConfig, useUpdateAdminConfig } from "../hooks/useAdmin";
import { useTranslation } from "react-i18next";
export function AdminConfigurationScreen() { const { t } = useTranslation(); const query = useAdminConfig(); const update = useUpdateAdminConfig(); const [supportEmail, setSupportEmail] = useState(""); const [maintenanceMessage, setMaintenanceMessage] = useState(""); useEffect(() => { if (query.data) { setSupportEmail(query.data.supportEmail ?? ""); setMaintenanceMessage(query.data.maintenanceMessage ?? ""); } }, [query.data]); return <Screen scroll padded={false}><AdminHeader title={t("admin.settings.configuration")} showBack /><YStack padding="$4">{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : <Card elevated><Text variant="h4">{t("admin.config.safeSettings")}</Text><Text variant="caption">{t("admin.config.noSecrets")}</Text><Input label={t("admin.config.supportEmail")} value={supportEmail} onChangeText={setSupportEmail} keyboardType="email-address" autoCapitalize="none" /><Input label={t("admin.config.maintenanceMessage")} value={maintenanceMessage} onChangeText={setMaintenanceMessage} multiline style={{ minHeight: 100, textAlignVertical: "top" }} /><Button loading={update.isPending} onPress={() => update.mutate({ supportEmail, maintenanceMessage })}>{t("common.save")}</Button></Card>}</YStack></Screen>; }
