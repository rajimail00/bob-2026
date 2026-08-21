import { Ionicons } from "@expo/vector-icons";
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
import {
  useJobApplicants,
  useOfferApplicant,
} from "../hooks/useApplications";
import { getApiErrorMessage } from "@/lib/apiClient";

interface Props {
  route: {
    params: {
      jobId: string;
      applicationId: string;
    };
  };
  navigation: {
    navigate: (
      screen: "Chat",
      params: { jobId: string; workerId: string }
    ) => void;
  };
}

export function ApplicantProfileScreen({
  route,
  navigation,
}: Props) {
  const { jobId, applicationId } = route.params;

  const applicantsQuery = useJobApplicants(jobId);
  const offerApplicant = useOfferApplicant(jobId);

  if (applicantsQuery.isLoading) {
    return <LoadingState />;
  }

  if (applicantsQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load applicant"
        retryLabel="Try again"
        onRetry={() => applicantsQuery.refetch()}
      />
    );
  }

  const application = applicantsQuery.data?.find(
    (item) => item._id === applicationId
  );

  if (!application) {
    return (
      <ErrorState
        title="Applicant not found"
        retryLabel="Try again"
        onRetry={() => applicantsQuery.refetch()}
      />
    );
  }

  const worker = application.workerId;
  const name = `${worker.firstName ?? ""} ${
    worker.lastName ?? ""
  }`.trim();

  const confirmOffer = () => {
    Alert.alert(
      "Offer this job?",
      `Do you want to send the job offer to ${name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send Offer",
          onPress: async () => {
            try {
              await offerApplicant.mutateAsync(application._id);

              Alert.alert(
                "Offer sent",
                `The job offer was sent to ${name}.`
              );
            } catch (error) {
              Alert.alert(
                "Unable to send offer",
                getApiErrorMessage(
                  error,
                  "The offer could not be sent. Please try again."
                )
              );
            }
          },
        },
      ]
    );
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
              {(worker.rating?.average ?? 0).toFixed(1)} / 5 ·{" "}
              {worker.rating?.count ?? 0} reviews
            </Text>
          </XStack>

          <StatusPill
            label={application.status.replace("_", " ")}
            tone={application.status === "offered" ? "brand" : "neutral"}
          />
        </YStack>

        <Card gap="$2">
          <Text variant="h4">Application message</Text>

          <Text variant="body" muted>
            {application.message || "No application message provided."}
          </Text>
        </Card>

        <Button
          variant="outline"
          fullWidth
          onPress={() =>
            navigation.navigate("Chat", {
              jobId,
              workerId: worker._id,
            })
          }
        >
          Chat
        </Button>

        {application.status === "pending" ? (
          <Button
            fullWidth
            loading={offerApplicant.isPending}
            onPress={confirmOffer}
          >
            Offer Job
          </Button>
        ) : null}
      </YStack>
    </Screen>
  );
}