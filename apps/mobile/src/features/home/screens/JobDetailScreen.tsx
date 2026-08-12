import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Alert, Image } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { ApplicantCard } from "@/features/applications/components/ApplicantCard";
import { ApplyForm } from "@/features/applications/components/ApplyForm";
import { useJobApplicants, useMyApplications, useSelectApplicant } from "@/features/applications/hooks/useApplications";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RatingForm } from "@/features/reviews/components/RatingForm";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import { useCompleteJob, useDeleteJob, useJob } from "../hooks/useJobs";

const STATUS_TONE = {
  active: "active",
  assigned: "brand",
  completed: "neutral",
  cancelled: "danger",
  draft: "neutral",
} as const;

interface Props {
  route: { params: { jobId: string } };
  navigation: { navigate: (screen: string, params?: { jobId: string }) => void; goBack: () => void };
}

export function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const user = useAuthStore((s) => s.user);

  const jobQuery = useJob(jobId);
  const applicantsQuery = useJobApplicants(jobQuery.data && jobQuery.data.clientId._id === user?.id ? jobId : undefined);
  const myApplicationsQuery = useMyApplications();
  const selectApplicant = useSelectApplicant(jobId);
  const completeJob = useCompleteJob();
  const deleteJob = useDeleteJob();
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);

  if (jobQuery.isLoading) return <LoadingState label={t("common.loading")} />;
  if (jobQuery.isError || !jobQuery.data) {
    return (
      <ErrorState
        title={t("common.genericError")}
        retryLabel={t("common.retry")}
        onRetry={() => jobQuery.refetch()}
      />
    );
  }

  const job = jobQuery.data;
  const isOwner = user?.id === job.clientId._id;
  const isAssignedWorker = Boolean(user?.id && job.assignedWorkerId === user.id);
  const hasWorkerProfile = Boolean(user?.workerProfile);
  const alreadyApplied = (myApplicationsQuery.data ?? []).some((a) => a.jobId._id === jobId);

  return (
    <Screen scroll>
      <YStack gap="$4" paddingBottom="$6">
        {job.media[0] ? (
          <Image source={{ uri: job.media[0].url }} style={{ width: "100%", height: 220, borderRadius: 14 }} />
        ) : null}

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" color="$brand600">
            {job.categoryId.name[locale] ?? job.categoryId.name.en}
          </Text>
          <StatusPill label={job.status} tone={STATUS_TONE[job.status]} />
        </XStack>

        <Text variant="h2">{job.title}</Text>
        <Text variant="body" muted>
          {job.description}
        </Text>

        <Card gap="$2">
          <XStack justifyContent="space-between">
            <Text variant="caption">Budget</Text>
            <Text variant="body">€{job.budget}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption">Date</Text>
            <Text variant="body">{new Date(job.date).toLocaleDateString(locale)}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption">Address</Text>
            <Text variant="body">{job.address}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption">People needed</Text>
            <Text variant="body">{job.peopleNeeded}</Text>
          </XStack>
        </Card>

        {(isOwner || isAssignedWorker) && job.status !== "active" ? (
          <Button variant="outline" onPress={() => navigation.navigate("Chat", { jobId })}>
            Messages
          </Button>
        ) : null}

        {isOwner ? (
          <OwnerActions
            jobStatus={job.status}
            applicants={applicantsQuery.data}
            isLoadingApplicants={applicantsQuery.isLoading}
            onSelect={(applicationId) => selectApplicant.mutate(applicationId)}
            isSelecting={selectApplicant.isPending}
            onComplete={async () => {
              setCompleteError(null);
              try {
                await completeJob.mutateAsync(jobId);
              } catch (err) {
                setCompleteError(getApiErrorMessage(err, t("common.genericError")));
              }
            }}
            isCompleting={completeJob.isPending}
            completeError={completeError}
            showRatingForm={showRatingForm}
            onStartRating={() => setShowRatingForm(true)}
            jobId={jobId}
            onDelete={() => {
              Alert.alert("Delete this job?", `"${job.title}" will be removed and can't be recovered.`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    setDeleteError(null);
                    try {
                      await deleteJob.mutateAsync(jobId);
                      navigation.goBack();
                    } catch (err) {
                      setDeleteError(getApiErrorMessage(err, t("common.genericError")));
                    }
                  },
                },
              ]);
            }}
            isDeleting={deleteJob.isPending}
            deleteError={deleteError}
          />
        ) : (
          <WorkerActions
            jobStatus={job.status}
            isAssignedWorker={isAssignedWorker}
            hasWorkerProfile={hasWorkerProfile}
            alreadyApplied={alreadyApplied}
            onSetupProfile={() => navigation.navigate("WorkerProfileSetup")}
            jobId={jobId}
            showRatingForm={showRatingForm}
            onStartRating={() => setShowRatingForm(true)}
          />
        )}
      </YStack>
    </Screen>
  );
}

function OwnerActions({
  jobStatus,
  applicants,
  isLoadingApplicants,
  onSelect,
  isSelecting,
  onComplete,
  isCompleting,
  completeError,
  showRatingForm,
  onStartRating,
  jobId,
  onDelete,
  isDeleting,
  deleteError,
}: {
  jobStatus: string;
  applicants: ReturnType<typeof useJobApplicants>["data"];
  isLoadingApplicants: boolean;
  onSelect: (applicationId: string) => void;
  isSelecting: boolean;
  onComplete: () => void;
  isCompleting: boolean;
  completeError: string | null;
  showRatingForm: boolean;
  onStartRating: () => void;
  jobId: string;
  onDelete: () => void;
  isDeleting: boolean;
  deleteError: string | null;
}) {
  if (jobStatus === "active") {
    return (
      <YStack gap="$3">
        <Text variant="h4">Applicants</Text>
        {isLoadingApplicants ? (
          <LoadingState />
        ) : applicants && applicants.length > 0 ? (
          applicants.map((application) => (
            <ApplicantCard
              key={application._id}
              application={application}
              onSelect={() => onSelect(application._id)}
              isSelecting={isSelecting}
              disabled={isSelecting}
            />
          ))
        ) : (
          <Text variant="body" muted>
            No applicants yet.
          </Text>
        )}

        {deleteError ? (
          <Text variant="small" color="$danger">
            {deleteError}
          </Text>
        ) : null}
        <Button variant="destructive" onPress={onDelete} loading={isDeleting}>
          Delete job
        </Button>
      </YStack>
    );
  }

  if (jobStatus === "assigned") {
    return (
      <YStack gap="$3">
        {completeError ? (
          <Text variant="small" color="$danger">
            {completeError}
          </Text>
        ) : null}
        <Button onPress={onComplete} loading={isCompleting} fullWidth>
          Mark as complete
        </Button>
      </YStack>
    );
  }

  if (jobStatus === "completed") {
    if (showRatingForm) return <RatingForm jobId={jobId} onDone={() => undefined} />;
    return (
      <Button variant="outline" onPress={onStartRating} fullWidth>
        Rate the worker
      </Button>
    );
  }

  return null;
}

function WorkerActions({
  jobStatus,
  isAssignedWorker,
  hasWorkerProfile,
  alreadyApplied,
  onSetupProfile,
  jobId,
  showRatingForm,
  onStartRating,
}: {
  jobStatus: string;
  isAssignedWorker: boolean;
  hasWorkerProfile: boolean;
  alreadyApplied: boolean;
  onSetupProfile: () => void;
  jobId: string;
  showRatingForm: boolean;
  onStartRating: () => void;
}) {
  if (jobStatus === "active") {
    if (!hasWorkerProfile) {
      return (
        <YStack gap="$3">
          <Text variant="body" muted>
            Set up your worker profile to apply to jobs.
          </Text>
          <Button onPress={onSetupProfile} fullWidth>
            Set up worker profile
          </Button>
        </YStack>
      );
    }
    if (alreadyApplied) {
      return (
        <Text variant="body" muted>
          You've already applied to this job.
        </Text>
      );
    }
    return <ApplyForm jobId={jobId} onApplied={() => undefined} />;
  }

  if (jobStatus === "assigned" && isAssignedWorker) {
    return (
      <Text variant="body" muted>
        You're assigned to this job.
      </Text>
    );
  }

  if (jobStatus === "completed" && isAssignedWorker) {
    if (showRatingForm) return <RatingForm jobId={jobId} onDone={() => undefined} />;
    return (
      <Button variant="outline" onPress={onStartRating} fullWidth>
        Rate the client
      </Button>
    );
  }

  return null;
}
