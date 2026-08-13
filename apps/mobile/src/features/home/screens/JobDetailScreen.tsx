import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Alert } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { ApplicantCarousel } from "@/features/applications/components/ApplicantCarousel";
import { ApplyForm } from "@/features/applications/components/ApplyForm";
import type { Application } from "@/features/applications/types/application.types";
import { useJobApplicants, useMyApplications, useSelectApplicant } from "@/features/applications/hooks/useApplications";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ConversationRow } from "@/features/messages/components/ConversationRow";
import { useJobConversations } from "@/features/messages/hooks/useJobConversations";
import { RatingForm } from "@/features/reviews/components/RatingForm";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import { IconValue } from "../components/IconValue";
import { MediaCarousel } from "../components/MediaCarousel";
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
  navigation: { navigate: (screen: string, params?: { jobId: string; workerId?: string }) => void; goBack: () => void };
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
  const pendingApplicantsCount = (applicantsQuery.data ?? []).filter((a) => a.status === "pending").length;

  return (
    <Screen scroll>
      <YStack gap="$4" paddingBottom="$6">
        <MediaCarousel media={job.media} />

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" color="$brand600">
            {job.categoryId.name[locale] ?? job.categoryId.name.en}
          </Text>
          <XStack alignItems="center" gap="$2">
            {isOwner && pendingApplicantsCount > 0 ? <NotificationBell count={pendingApplicantsCount} /> : null}
            <StatusPill label={job.status} tone={STATUS_TONE[job.status]} />
          </XStack>
        </XStack>

        <Text variant="h2">{job.title}</Text>
        <Text variant="body" muted>
          {job.description}
        </Text>

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

        {isOwner ? (
          <OwnerActions
            jobId={jobId}
            jobStatus={job.status}
            applicants={applicantsQuery.data}
            isLoadingApplicants={applicantsQuery.isLoading}
            onSelect={(applicationId) => selectApplicant.mutate(applicationId)}
            isSelecting={selectApplicant.isPending}
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

type InboxTab = "applicants" | "messages";

function OwnerActions({
  jobId,
  jobStatus,
  applicants,
  isLoadingApplicants,
  onSelect,
  isSelecting,
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
  onSelect: (applicationId: string) => void;
  isSelecting: boolean;
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
  const [inboxTab, setInboxTab] = useState<InboxTab>("applicants");
  const conversationsQuery = useJobConversations(jobId);

  if (jobStatus === "active") {
    return (
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <PillTabs
            options={[
              { value: "applicants", label: "Bewerber" },
              { value: "messages", label: "Nachrichten" },
            ]}
            value={inboxTab}
            onChange={setInboxTab}
          />
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
            {isDeleting ? null : <Ionicons name="trash-outline" size={16} color="#C1554B" />}
          </XStack>
        </XStack>

        {inboxTab === "applicants" ? (
          isLoadingApplicants ? (
            <LoadingState />
          ) : applicants && applicants.length > 0 ? (
            <ApplicantCarousel
              applicants={applicants}
              onSelect={onSelect}
              onMessage={onOpenChat}
              isSelecting={isSelecting}
            />
          ) : (
            <EmptyState title="No applicants yet" body="Candidates who apply will show up here." />
          )
        ) : conversationsQuery.isLoading ? (
          <LoadingState />
        ) : conversationsQuery.data && conversationsQuery.data.length > 0 ? (
          <YStack gap="$2">
            {conversationsQuery.data.map((conversation) => (
              <ConversationRow
                key={conversation.workerId}
                conversation={conversation}
                onPress={() => onOpenChat(conversation.workerId)}
              />
            ))}
          </YStack>
        ) : (
          <EmptyState title="No messages yet" body="Conversations with applicants will show up here." />
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
