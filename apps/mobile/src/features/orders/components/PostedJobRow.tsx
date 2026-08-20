import { useState } from "react";
import { Alert } from "react-native";
import { YStack } from "tamagui";
import { JobCard } from "@/features/home/components/JobCard";
import { useDeleteJob } from "@/features/home/hooks/useJobs";
import type { Job } from "@/features/home/types/job.types";
import { getApiErrorMessage } from "@/lib/apiClient";
import { Text } from "@/components/ui/Text";

interface PostedJobRowProps {
  job: Job;
  onPress: () => void;
}

/** A posted-job list row with a delete affordance — only offered while the job has no assigned
 * worker yet, matching the backend's rule (an in-progress/completed job can't be hard-deleted). */
export function PostedJobRow({ job, onPress }: PostedJobRowProps) {
  const deleteJob = useDeleteJob();
  const [error, setError] = useState<string | null>(null);
  const applicationCount = job.pendingApplicantsCount ?? 0;

  const confirmDelete = () => {
    Alert.alert("Delete this job?", `"${job.title}" will be removed and can't be recovered.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            await deleteJob.mutateAsync(job._id);
          } catch (err) {
            setError(getApiErrorMessage(err, "Couldn't delete this job. Please try again."));
          }
        },
      },
    ]);
  };

  return (
    <YStack gap="$2">
      <JobCard
        job={job}
        onPress={onPress}
        onDelete={job.status === "active" ? confirmDelete : undefined}
        isDeleting={deleteJob.isPending}
        badge={{
          icon: "people-outline",
          count: applicationCount,
          showZero: true,
          accessibilityLabel: `${applicationCount} ${applicationCount === 1 ? "application" : "applications"}`,
        }}
      />
      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
