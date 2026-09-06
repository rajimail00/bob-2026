import { useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import MapView, { Circle as MapCircle } from "react-native-maps";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { AdminHeader } from "../components/AdminHeader";
import { AdminMetricCard } from "../components/AdminMetricCard";
import { useAdminDashboard } from "../hooks/useAdmin";
import type { AdminPeriod } from "../types/admin.types";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

const periods: AdminPeriod[] = ["day", "week", "month", "year"];
const metricKeys = ["allUsers", "activeUsers", "averageTime", "jobPosts", "activeJobs", "supportTickets"] as const;

export function AdminDashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [period, setPeriod] = useState<AdminPeriod>("week");
  const [heatTab, setHeatTab] = useState<"geo" | "engagement" | "time">("geo");
  const query = useAdminDashboard(period);
  const data = query.data;
  const drill = (key: typeof metricKeys[number]) => {
    if (key === "allUsers" || key === "activeUsers") navigation.navigate("AdminTabs", { screen: "AdminUsers" });
    if (key === "activeJobs" || key === "jobPosts") navigation.navigate("AdminTabs", { screen: "AdminJobs" });
    if (key === "supportTickets") navigation.navigate("AdminTabs", { screen: "AdminTickets" });
  };

  return (
    <Screen scroll padded={false} safeAreaEdges={["top", "left", "right"]} scrollBottomPadding={16}>
      <AdminHeader title={t("admin.navigation.dashboard")} />
      <YStack padding="$4" gap="$4">
        <XStack gap="$2">{periods.map((value) => <Button key={value} size="sm" flex={1} variant={period === value ? "primary" : "outline"} onPress={() => setPeriod(value)}>{t(`admin.period.${value}`)}</Button>)}</XStack>
        {query.isLoading ? <ActivityIndicator color="#4F8266" size="large" /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : data ? (
          <>
            <XStack flexWrap="wrap" justifyContent="space-between" gap="$3">
              {metricKeys.map((key) => <AdminMetricCard key={key} label={t(`admin.metrics.${key}`)} metric={data.metrics[key]} suffix={key === "averageTime" && data.metrics[key].value !== null ? ` ${t("admin.metrics.minutes")}` : undefined} onPress={key === "averageTime" ? undefined : () => drill(key)} />)}
            </XStack>
            <Card elevated gap="$3">
              <Text variant="h4">{t("admin.dashboard.activity")}</Text>
              {data.activity.length ? data.activity.map((point) => {
                const max = Math.max(...data.activity.map((item) => item.value), 1);
                return <XStack key={point.label} alignItems="center" gap="$2"><Text variant="caption" width={76}>{point.label}</Text><YStack height={12} borderRadius="$pill" backgroundColor="$brand100" flex={1}><YStack height={12} width={`${Math.max(4, (point.value / max) * 100)}%`} borderRadius="$pill" backgroundColor="$primary" /></YStack><Text variant="caption" width={26}>{point.value}</Text></XStack>;
              }) : <Text muted>{t("admin.common.noData")}</Text>}
            </Card>
            <Card elevated gap="$3">
              <Text variant="h4">{t("admin.dashboard.heatMap")}</Text>
              <XStack gap="$2">{(["geo", "engagement", "time"] as const).map((value) => <Button key={value} size="sm" flex={1} variant={heatTab === value ? "primary" : "outline"} onPress={() => setHeatTab(value)}>{t(`admin.dashboard.${value}`)}</Button>)}</XStack>
              {heatTab === "geo" ? data.geo.length ? (
                <MapView style={{ height: 230, borderRadius: 14 }} initialRegion={{ latitude: data.geo[0]?.latitude ?? 51.1657, longitude: data.geo[0]?.longitude ?? 10.4515, latitudeDelta: 10, longitudeDelta: 10 }} scrollEnabled={false} zoomEnabled={false}>
                  {data.geo.map((point, index) => <MapCircle key={`${point.latitude}-${point.longitude}-${index}`} center={point} radius={Math.max(1500, point.count * 800)} fillColor="rgba(79,130,102,0.3)" strokeColor="#4F8266" />)}
                </MapView>
              ) : <Text muted>{t("admin.common.noData")}</Text> : (
                <YStack gap="$2">{data.activity.length ? data.activity.map((item) => <Pressable key={item.label}><XStack justifyContent="space-between"><Text>{item.label}</Text><Text color="$primary">{item.value}</Text></XStack></Pressable>) : <Text muted>{t("admin.common.noData")}</Text>}</YStack>
              )}
            </Card>
            <Text variant="caption">{t("admin.dashboard.utcNote")}</Text>
          </>
        ) : null}
      </YStack>
    </Screen>
  );
}
