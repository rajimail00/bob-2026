import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { SectionList } from "react-native";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { useMyApplications } from "@/features/applications/hooks/useApplications";
import { JobCard } from "@/features/home/components/JobCard";
import { useMyPostedJobs } from "@/features/home/hooks/useJobs";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { OrdersStackParamList } from "@/navigation/types";
import { PostedJobRow } from "../components/PostedJobRow";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersList">;
type Tab = "posted" | "applied";

export function OrdersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("posted");
  const user = useAuthStore((s) => s.user);
  const hasWorkerProfile = Boolean(user?.workerProfile);

  const postedQuery = useMyPostedJobs();
  const appliedQuery = useMyApplications();
  const currentPostedJobs = (postedQuery.data ?? []).filter(
    (job) =>
      job.status !== "completed" &&
      job.status !== "cancelled" &&
      job.status !== "expired"
  );

  const historicalPostedJobs = (postedQuery.data ?? []).filter(
    (job) =>
      job.status === "completed" ||
      job.status === "cancelled" ||
      job.status === "expired"
  );

  const postedSections = [
    {
      title: t("orders.current"),
      data: currentPostedJobs,
    },
    {
      title: t("orders.history"),
      data: historicalPostedJobs,
    },
  ].filter((section) => section.data.length > 0);
  const currentApplications = (appliedQuery.data ?? []).filter(
    (application) =>
      application.jobId.status !== "completed" &&
      application.jobId.status !== "cancelled" &&
      application.jobId.status !== "expired"
  );

  const historicalApplications = (appliedQuery.data ?? []).filter(
    (application) =>
      application.jobId.status === "completed" ||
      application.jobId.status === "cancelled" ||
      application.jobId.status === "expired"
  );

  const applicationSections = [
    {
      title: t("orders.current"),
      data: currentApplications,
    },
    {
      title: t("orders.history"),
      data: historicalApplications,
    },
  ].filter((section) => section.data.length > 0);

  useFocusEffect(
    useCallback(() => {
      void postedQuery.refetch();
      void appliedQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Screen padded={false}>
      <YStack padding="$4">
        <PillTabs
          options={[
            { value: "posted", label: t("orders.postedTab") },
            { value: "applied", label: t("orders.appliedTab") },
          ]}
          value={tab}
          onChange={setTab}
        />
      </YStack>

      {tab === "posted" ? (
        postedQuery.isLoading ? (
          <LoadingState />
        ) : postedQuery.isError ? (
            <ErrorState
              title={t("orders.loadOrdersError")}
              message={getApiErrorMessage(
                postedQuery.error,
                t("orders.loadOrdersError")
              )}
              retryLabel={t("common.retry")}
              onRetry={() => postedQuery.refetch()}
            />
        ) : postedQuery.data && postedQuery.data.length > 0 ? (
          <SectionList
            sections={postedSections}
            keyExtractor={(job) => job._id}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <YStack
                paddingHorizontal="$4"
                paddingTop="$2"
                paddingBottom="$2"
              >
                <Text variant="h4">{section.title}</Text>
              </YStack>
            )}
            renderItem={({ item }) => (
              <YStack paddingHorizontal="$4" paddingBottom="$3">
                <PostedJobRow
                  job={item}
                  onPress={() =>
                    navigation.navigate("JobDetail", {
                      jobId: item._id,
                    })
                  }
                />
              </YStack>
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshing={postedQuery.isFetching}
            onRefresh={() => postedQuery.refetch()}
          />
        ) : (
          <EmptyState
            title={t("orders.noOrdersTitle")}
            body={t("orders.noOrdersBody")}
          />
        )
      ) : !hasWorkerProfile ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap="$4"
          paddingHorizontal="$5"
        >
          <EmptyState
            title={t("orders.workerProfileTitle")}
            body={t("orders.workerProfileBody")}
          />

          <Button onPress={() => navigation.navigate("WorkerProfileSetup")}>
            {t("orders.workerProfileButton")}
          </Button>
        </YStack>
      ) : appliedQuery.isLoading ? (
        <LoadingState />
      ) : appliedQuery.isError ? (
        <ErrorState
          title={t("orders.loadApplicationsError")}
          message={getApiErrorMessage(
            appliedQuery.error,
            t("orders.loadApplicationsError")
          )}
          retryLabel={t("common.retry")}
          onRetry={() => appliedQuery.refetch()}
        />
      ) : appliedQuery.data && appliedQuery.data.length > 0 ? (
        <SectionList
          sections={applicationSections}
          keyExtractor={(application) => application._id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <YStack
              paddingHorizontal="$4"
              paddingTop="$2"
              paddingBottom="$2"
            >
              <Text variant="h4">{section.title}</Text>
            </YStack>
          )}
          renderItem={({ item }) => (
            <YStack paddingHorizontal="$4" paddingBottom="$3">
              <JobCard
                job={item.jobId}
                onPress={() =>
                  navigation.navigate("JobDetail", {
                    jobId: item.jobId._id,
                  })
                }
                badge={{
                  icon: "chatbubble-ellipses",
                  count: item.unreadMessageCount,
                  accessibilityLabel: t("orders.unreadMessages", {
                    count: item.unreadMessageCount,
                  }),
                }}
              />
            </YStack>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={appliedQuery.isFetching}
          onRefresh={() => appliedQuery.refetch()}
        />
      ) : (
        <EmptyState
          title={t("orders.noApplicationsTitle")}
          body={t("orders.noApplicationsBody")}
        />
      )}
    </Screen>
  );
}
