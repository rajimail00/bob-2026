import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { useJob } from "@/features/home/hooks/useJobs";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useJobApplicants, useOfferApplicant } from "../hooks/useApplications";

interface Props {
  route: { params: { jobId: string; applicationId: string } };
  navigation: {
    navigate: (screen: "Chat", params: { jobId: string; workerId: string }) => void;
  };
}

export function ApplicantProfileScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { jobId, applicationId } = route.params;
  const applicantsQuery = useJobApplicants(jobId);
  const jobQuery = useJob(jobId);
  const offerApplicant = useOfferApplicant(jobId);

  if (applicantsQuery.isLoading || jobQuery.isLoading) return <LoadingState />;

  if (applicantsQuery.isError || jobQuery.isError) {
    return (
      <ErrorState
        title={t("applications.loadError")}
        retryLabel={t("common.retry")}
        onRetry={() => {
          void applicantsQuery.refetch();
          void jobQuery.refetch();
        }}
      />
    );
  }

  const application = applicantsQuery.data?.find((item) => item._id === applicationId);

  if (!application || !jobQuery.data) {
    return (
      <ErrorState
        title={t("applications.notFound")}
        retryLabel={t("common.retry")}
        onRetry={() => applicantsQuery.refetch()}
      />
    );
  }

  const job = jobQuery.data;
  const canOffer = application.status === "pending" && job.status === "active";
  const worker = application.workerId;
  const name = `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim();

  const confirmOffer = () => {
    Alert.alert(t("applications.offerTitle"), t("applications.offerQuestion", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("applications.offerJob"),
        onPress: async () => {
          try {
            await offerApplicant.mutateAsync(application._id);
            Alert.alert(t("applications.offerSentTitle"), t("applications.offerSentMessage", { name }));
          } catch (error) {
            Alert.alert(
              t("applications.offerErrorTitle"),
              getApiErrorMessage(error, t("applications.offerErrorFallback"))
            );
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <YStack gap="$4" paddingBottom="$6">
        <YStack alignItems="center" gap="$2">
          <Avatar uri={worker.photoUrl} name={name} size={100} />
          <Text variant="h2">{name}</Text>
          <XStack alignItems="center" gap="$1">
            <Ionicons name="star" size={18} color="#4F8266" />
            <Text variant="body">
              {t("applications.rating", {
                average: (worker.rating?.average ?? 0).toFixed(1),
                count: worker.rating?.count ?? 0,
              })}
            </Text>
          </XStack>
          <StatusPill
            label={t(`applications.status.${application.status}`)}
            tone={application.status === "offered" ? "brand" : "neutral"}
          />
        </YStack>

        <Card gap="$2">
          <Text variant="h4">{t("applications.applicationMessage")}</Text>
          <Text variant="body" muted>
            {application.message || t("applications.noApplicationMessage")}
          </Text>
        </Card>

        <Button
          variant="outline"
          fullWidth
          onPress={() => navigation.navigate("Chat", { jobId, workerId: worker._id })}
        >
          {t("applications.chat")}
        </Button>

        {job.status === "offer_pending" && application.status === "pending" ? (
          <Card gap="$2">
            <Text variant="body" muted textAlign="center">
              {t("applications.anotherOfferPending")}
            </Text>
          </Card>
        ) : null}

        {canOffer ? (
          <Button fullWidth loading={offerApplicant.isPending} onPress={confirmOffer}>
            {t("applications.offerJob")}
          </Button>
        ) : null}
      </YStack>
    </Screen>
  );
}
