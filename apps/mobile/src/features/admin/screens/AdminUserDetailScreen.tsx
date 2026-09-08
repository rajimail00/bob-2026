import { Alert } from "react-native";
import { XStack, YStack } from "tamagui";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import type { AdminStackParamList } from "@/navigation/types";
import { AdminHeader } from "../components/AdminHeader";
import { useAdminUser, useSetAdminUserStatus } from "../hooks/useAdmin";

export function AdminUserDetailScreen({ route, navigation }: NativeStackScreenProps<AdminStackParamList, "AdminUserDetail">) {
  const { t, i18n } = useTranslation();
  const query = useAdminUser(route.params.userId);
  const statusMutation = useSetAdminUserStatus();

  if (query.isLoading) {
    return <Screen padded={false}><AdminHeader title={t("admin.users.details")} showBack /><LoadingState /></Screen>;
  }
  if (query.isError || !query.data) {
    return <Screen padded={false}><AdminHeader title={t("admin.users.details")} showBack /><ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /></Screen>;
  }

  const { user, stats } = query.data;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const type = user.workerProfile ? "worker" : "client";
  const toggleStatus = () => {
    const status = user.status === "active" ? "banned" : "active";
    Alert.alert(
      t(`admin.users.${status}Title`),
      t("admin.users.confirmStatus", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t(`admin.users.${status}`),
          style: status === "banned" ? "destructive" : "default",
          onPress: () => statusMutation.mutate({ id: user._id, status }),
        },
      ]
    );
  };
  const statRows = Object.entries(stats).filter(([key]) => key !== "audits") as [string, number][];

  return (
    <Screen scroll padded={false}>
      <AdminHeader title={t("admin.users.details")} showBack />
      <YStack padding="$4" gap="$4">
        <Card elevated alignItems="center">
          <Avatar uri={user.photoUrl} name={name} size={84} />
          <Text variant="h3">{name}</Text>
          <Text muted>{user.email}</Text>
          <XStack gap="$2">
            <StatusPill label={t(`admin.accountStatus.${user.status}`)} tone={user.status === "active" ? "active" : "danger"} />
            <StatusPill label={t(`admin.roles.${type}`)} tone="brand" />
          </XStack>
        </Card>

        <Card elevated gap="$2">
          <Detail label={t("admin.users.registered")} value={new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(new Date(user.createdAt))} />
          <Detail label={t("admin.users.locale")} value={user.locale.toUpperCase()} />
          <Detail label={t("admin.users.subscription")} value={user.subscriptionTier} />
          <Detail label={t("admin.users.rating")} value={`${user.rating.average.toFixed(1)} (${user.rating.count})`} />
          {user.workerProfile ? (
            <>
              <Detail label={t("admin.users.categories")} value={user.workerProfile.categories.join(", ") || "—"} />
              <Detail label={t("admin.users.serviceHours")} value={user.workerProfile.serviceHours} />
            </>
          ) : null}
        </Card>

        <Card elevated>
          <Text variant="h4">{t("admin.users.activity")}</Text>
          <XStack flexWrap="wrap" gap="$3">
            {statRows.map(([key, value]) => (
              <YStack key={key} width="46%">
                <Text variant="h3" color="$primary">{value}</Text>
                <Text variant="caption">{t(`admin.userStats.${key}`)}</Text>
              </YStack>
            ))}
          </XStack>
        </Card>

        <XStack gap="$2">
          <Button
            flex={1}
            variant="outline"
            onPress={() => navigation.navigate("AdminUserJobs", { userId: user._id })}
            aria-label={t("admin.userJobs.openFor", { name })}
          >
            {t("admin.userJobs.button")}
          </Button>
          {user.status !== "deleted" ? (
            <Button flex={1} variant={user.status === "active" ? "destructive" : "primary"} loading={statusMutation.isPending} onPress={toggleStatus}>
              {t(`admin.users.${user.status === "active" ? "banned" : "active"}`)}
            </Button>
          ) : null}
        </XStack>

        <Card>
          <Text variant="h4">{t("admin.users.audit")}</Text>
          {stats.audits.length ? stats.audits.map((entry) => (
            <Text key={entry._id} variant="small">
              {entry.action} · {new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}
            </Text>
          )) : <Text muted>{t("admin.common.noData")}</Text>}
        </Card>
      </YStack>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <XStack justifyContent="space-between" gap="$3"><Text muted>{label}</Text><Text flex={1} textAlign="right">{value}</Text></XStack>;
}
