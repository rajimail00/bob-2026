import { ApplicantListRow } from "@/features/applications/components/ApplicantListRow";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Alert } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { SwipeToConfirm } from "@/components/ui/SwipeToConfirm";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { ApplyForm } from "@/features/applications/components/ApplyForm";
import type { Application, MyApplication } from "@/features/applications/types/application.types";
import {
  useJobApplicants,
  useMyApplications,
  useRespondToOffer,
} from "@/features/applications/hooks/useApplications";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useJobConversations } from "@/features/messages/hooks/useJobConversations";
import { RatingForm } from "@/features/reviews/components/RatingForm";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import { IconValue } from "../components/IconValue";
import { JobCountdown } from "../components/JobCountdown";
import { MediaCarousel } from "../components/MediaCarousel";
import { ReportProblemModal, type ProblemReason } from "../components/ReportProblemModal";
import { useCancelJob, useCompleteJob, useDeleteJob, useJob, useReportProblem } from "../hooks/useJobs";
import { canEditJob } from "../utils/jobEditing";

const STATUS_TONE = {
  active: "active",
  offer_pending: "brand",
  assigned: "brand",
  completed: "neutral",
  cancelled: "danger",
  draft: "neutral",
  expired: "neutral",
} as const;

interface Props {
  route: {
    params: {
      jobId: string;
    };
  };

  navigation: {
    navigate(
      screen: "Chat",
      params: { jobId: string; workerId: string }
    ): void;

    navigate(
      screen: "ApplicantProfile",
      params: { jobId: string; applicationId: string }
    ): void;

    navigate(screen: "WorkerProfileSetup"): void;

    getParent():
      | {
          navigate(
            screen: "Orders",
            params: { screen: "EditJob"; params: { jobId: string } }
          ): void;
        }
      | undefined;

    goBack(): void;
  };
}

export function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const user = useAuthStore((s) => s.user);

  const jobQuery = useJob(jobId);
  const isOwnerView = Boolean(jobQuery.data && jobQuery.data.clientId._id === user?.id);
  const applicantsQuery = useJobApplicants(isOwnerView ? jobId : undefined);
  const myApplicationsQuery = useMyApplications();
  const respondToOffer = useRespondToOffer(jobId);
  const completeJob = useCompleteJob();
  const cancelJob = useCancelJob();
  const deleteJob = useDeleteJob();
  const reportProblem = useReportProblem();
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);

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
  const canEdit = canEditJob(job, user?.id);
  const hasWorkerProfile = Boolean(user?.workerProfile);
  const myApplication = (myApplicationsQuery.data ?? []).find((a) => a.jobId._id === jobId);
  const pendingApplicantsCount = (applicantsQuery.data ?? []).filter((a) => a.status === "pending").length;

  const handleReportProblem = async (reason: ProblemReason) => {
    setIsProblemModalOpen(false);
    try {
      await reportProblem.mutateAsync({ jobId, reason });
      await jobQuery.refetch();
    } catch {
      // The report still submits best-effort; a failed follow-up refetch isn't worth surfacing.
    }
  };

  return (
    <Screen scroll>
      <YStack gap="$4" paddingBottom="$6">
        <MediaCarousel media={job.media} />

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" color="$brand600">
            {job.categoryId.name[locale] ?? job.categoryId.name.en}
          </Text>
          <XStack alignItems="center" gap="$2">
            {isOwner && job.status === "active" && pendingApplicantsCount > 0 ? (
              <NotificationBell count={pendingApplicantsCount} />
            ) : null}
            <StatusPill label={job.status.replace("_", " ")} tone={STATUS_TONE[job.status]} />
          </XStack>
        </XStack>

        <Text variant="h2">{job.title}</Text>
        <Text variant="body" muted>
          {job.description}
        </Text>

        {canEdit ? (
          <Button
            variant="outline"
            role="button"
            aria-label={t("jobEditing.editAction")}
            onPress={() =>
              navigation.getParent()?.navigate("Orders", {
                screen: "EditJob",
                params: { jobId },
              })
            }
          >
            {t("jobEditing.editAction")}
          </Button>
        ) : null}

        <Card gap="$3">
          <XStack flexWrap="wrap" gap="$4">
            <IconValue icon="pricetag-outline" value={`€${job.budget}`} />
            <IconValue icon="calendar-outline" value={new Date(job.date).toLocaleDateString(locale)} />
            <IconValue icon="person-outline" value={`${job.peopleNeeded} people`} />
          </XStack>
          <XStack alignItems="flex-start" gap="$2">
            <Ionicons name="location-outline" size={16} color="#4F8266" style={{ marginTop: 2 }} />
            <Text variant="body" flex={1}>
              {job.address}
            </Text>
          </XStack>
          <IconValue icon="time-outline" value={`Posted ${new Date(job.createdAt).toLocaleDateString(locale)}`} muted />
        </Card>

        {job.status === "assigned" ? (
          <Card alignItems="center">
            <JobCountdown targetDate={job.date} />
          </Card>
        ) : null}

        {(isOwner || isAssignedWorker) && job.status !== "active" && job.assignedWorkerId ? (
          <Button
            variant="outline"
            onPress={() =>
              navigation.navigate("Chat", { jobId, workerId: isOwner ? job.assignedWorkerId! : (user!.id as string) })
            }
          >
            Messages
          </Button>
        ) : null}

        {job.status === "assigned" && (isOwner || isAssignedWorker) ? (
          <Button
            variant="outline"
            loading={reportProblem.isPending}
            onPress={() => setIsProblemModalOpen(true)}
          >
            Report a problem
          </Button>
        ) : null}

        {isOwner ? (
          <OwnerActions
            jobId={jobId}
            jobStatus={job.status}
            applicants={applicantsQuery.data}
            isLoadingApplicants={applicantsQuery.isLoading}
            onOpenApplicant={(applicationId) =>
              navigation.navigate("ApplicantProfile", {
                jobId,
                applicationId,
              })
            }
            onOpenChat={(workerId) => navigation.navigate("Chat", { jobId, workerId })}
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
            myApplication={myApplication}
            onSetupProfile={() => navigation.navigate("WorkerProfileSetup")}
            jobId={jobId}
            showRatingForm={showRatingForm}
            onStartRating={() => setShowRatingForm(true)}
            onRespond={async (accept) => {
              if (!myApplication) return;
              setRespondError(null);
              try {
                await respondToOffer.mutateAsync({ applicationId: myApplication._id, accept });
              } catch (err) {
                setRespondError(getApiErrorMessage(err, t("common.genericError")));
              }
            }}
            isResponding={respondToOffer.isPending}
            respondError={respondError}
          />
        )}
      </YStack>

      <ReportProblemModal
        visible={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
        onSelectReason={handleReportProblem}
        isOwner={isOwner}
      />
    </Screen>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <XStack position="relative" width={28} height={28} alignItems="center" justifyContent="center">
      <Ionicons name="notifications" size={20} color="#4F8266" />
      <XStack
        position="absolute"
        top={-2}
        right={-4}
        minWidth={16}
        height={16}
        borderRadius={8}
        paddingHorizontal={3}
        backgroundColor="$danger"
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="small" color="white" fontWeight="700" fontSize={10}>
          {count}
        </Text>
      </XStack>
    </XStack>
  );
}


function OwnerActions({
  jobId,
  jobStatus,
  applicants,
  isLoadingApplicants,
  onOpenApplicant,
  onOpenChat,
  onComplete,
  isCompleting,
  completeError,
  showRatingForm,
  onStartRating,
  onDelete,
  isDeleting,
  deleteError,
}: {
  jobId: string;
  jobStatus: string;
  applicants: Application[] | undefined;
  isLoadingApplicants: boolean;
  onOpenApplicant: (applicationId: string) => void;
  onOpenChat: (workerId: string) => void;
  onComplete: () => void;
  isCompleting: boolean;
  completeError: string | null;
  showRatingForm: boolean;
  onStartRating: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  deleteError: string | null;
}) {
  const { t } = useTranslation();
  const conversationsQuery = useJobConversations(jobId);

  if (jobStatus === "active" || jobStatus === "offer_pending") {
    return (
      <YStack gap="$4">
        {jobStatus === "offer_pending" ? (
          <Text variant="body" muted>
            {t("applications.waitingOffer")}
          </Text>
        ) : null}

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="h3">{t("applications.title")}</Text>

          {jobStatus === "active" ? (
            <XStack
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor="$dangerBg"
              alignItems="center"
              justifyContent="center"
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete job"
            >
              {isDeleting ? null : (
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color="#C1554B"
                />
              )}
            </XStack>
          ) : null}
        </XStack>

        {isLoadingApplicants ? (
          <LoadingState />
        ) : applicants && applicants.length > 0 ? (
          <YStack gap="$2">
            {applicants.map((application) => {
              const conversation = conversationsQuery.data?.find(
                (item) => item.applicationId === application._id
              );

              return (
                <ApplicantListRow
                  key={application._id}
                  application={application}
                  conversation={conversation}
                  onPress={() => onOpenApplicant(application._id)}
                  onMessage={() => onOpenChat(application.workerId._id)}
                />
              );
            })}
          </YStack>
        ) : (
          <EmptyState
            title={t("applications.emptyTitle")}
            body={t("applications.emptyBody")}
          />
        )}


        {deleteError ? (
          <Text variant="small" color="$danger">
            {deleteError}
          </Text>
        ) : null}
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
        <SwipeToConfirm label="Swipe to mark complete" onConfirm={onComplete} loading={isCompleting} />
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

  if (jobStatus === "cancelled" || jobStatus === "expired") {
    return (
      <Text variant="body" muted>
        {jobStatus === "expired" ? t("jobs.expiredMessage") : t("jobs.cancelledMessage")}
      </Text>
    );
  }

  return null;
}

function WorkerActions({
  jobStatus,
  isAssignedWorker,
  hasWorkerProfile,
  myApplication,
  onSetupProfile,
  jobId,
  showRatingForm,
  onStartRating,
  onRespond,
  isResponding,
  respondError,
}: {
  jobStatus: string;
  isAssignedWorker: boolean;
  hasWorkerProfile: boolean;
  myApplication: MyApplication | undefined;
  onSetupProfile: () => void;
  jobId: string;
  showRatingForm: boolean;
  onStartRating: () => void;
  onRespond: (accept: boolean) => void;
  isResponding: boolean;
  respondError: string | null;
}) {
  const { t } = useTranslation();

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
    if (myApplication) {
      return (
        <Text variant="body" muted>
          You've already applied to this job.
        </Text>
      );
    }
    return <ApplyForm jobId={jobId} onApplied={() => undefined} />;
  }

  if (jobStatus === "offer_pending") {
    if (myApplication?.status === "offered") {
      return (
        <YStack gap="$3">
          <Text variant="h4">You've been offered this job!</Text>
          {respondError ? (
            <Text variant="small" color="$danger">
              {respondError}
            </Text>
          ) : null}
          <XStack gap="$2">
            <YStack flex={1}>
              <Button variant="outline" onPress={() => onRespond(false)} loading={isResponding} fullWidth>
                Decline
              </Button>
            </YStack>
            <YStack flex={1}>
              <Button onPress={() => onRespond(true)} loading={isResponding} fullWidth>
                Accept
              </Button>
            </YStack>
          </XStack>
        </YStack>
      );
    }
    return (
      <Text variant="body" muted>
        This job is currently being offered to another candidate.
      </Text>
    );
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

  if (jobStatus === "cancelled" || jobStatus === "expired") {
    return (
      <Text variant="body" muted>
        {jobStatus === "expired" ? t("jobs.expiredMessage") : t("jobs.cancelledMessage")}
      </Text>
    );
  }

  return null;
}
