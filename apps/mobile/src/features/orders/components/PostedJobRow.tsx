import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert } from "react-native";
import { XStack, YStack } from "tamagui";
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
      <XStack gap="$2" alignItems="flex-start">
        <YStack flex={1}>
          <JobCard job={job} onPress={onPress} />
        </YStack>
        {job.status === "active" ? (
          <XStack
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="$dangerBg"
            alignItems="center"
            justifyContent="center"
            marginTop="$1"
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete job"
          >
            {deleteJob.isPending ? null : <Ionicons name="trash-outline" size={16} color="#C1554B" />}
          </XStack>
        ) : null}
      </XStack>
      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
