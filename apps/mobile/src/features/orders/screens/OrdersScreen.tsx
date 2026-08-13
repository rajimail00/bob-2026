import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList } from "react-native";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
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
  const [tab, setTab] = useState<Tab>("posted");
  const user = useAuthStore((s) => s.user);
  const hasWorkerProfile = Boolean(user?.workerProfile);

  const postedQuery = useMyPostedJobs();
  const appliedQuery = useMyApplications();

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
            { value: "posted", label: "My Orders" },
            { value: "applied", label: "My Jobs" },
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
            title="Couldn't load your orders"
            message={getApiErrorMessage(postedQuery.error, "Couldn't load your orders")}
            retryLabel="Try again"
            onRetry={() => postedQuery.refetch()}
          />
        ) : postedQuery.data && postedQuery.data.length > 0 ? (
          <FlatList
            data={postedQuery.data}
            keyExtractor={(job) => job._id}
            renderItem={({ item }) => (
              <YStack paddingHorizontal="$4" paddingBottom="$3">
                <PostedJobRow job={item} onPress={() => navigation.navigate("JobDetail", { jobId: item._id })} />
              </YStack>
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshing={postedQuery.isFetching}
            onRefresh={() => postedQuery.refetch()}
          />
        ) : (
          <EmptyState title="No jobs posted yet" body="Jobs you post will show up here." />
        )
      ) : !hasWorkerProfile ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" paddingHorizontal="$5">
          <EmptyState
            title="Set up your worker profile"
            body="You need a worker profile before you can apply to jobs."
          />
          <Button onPress={() => navigation.navigate("WorkerProfileSetup")}>Set up worker profile</Button>
        </YStack>
      ) : appliedQuery.isLoading ? (
        <LoadingState />
      ) : appliedQuery.isError ? (
        <ErrorState
          title="Couldn't load your applications"
          message={getApiErrorMessage(appliedQuery.error, "Couldn't load your applications")}
          retryLabel="Try again"
          onRetry={() => appliedQuery.refetch()}
        />
      ) : appliedQuery.data && appliedQuery.data.length > 0 ? (
        <FlatList
          data={appliedQuery.data}
          keyExtractor={(application) => application._id}
          renderItem={({ item }) => (
            <YStack paddingHorizontal="$4" paddingBottom="$3">
              <JobCard
                job={item.jobId}
                onPress={() => navigation.navigate("JobDetail", { jobId: item.jobId._id })}
                badge={{ icon: "chatbubble-ellipses", count: item.unreadMessageCount }}
              />
            </YStack>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={appliedQuery.isFetching}
          onRefresh={() => appliedQuery.refetch()}
        />
      ) : (
        <EmptyState title="No applications yet" body="Jobs you apply to will show up here." />
      )}
    </Screen>
  );
}
