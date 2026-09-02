import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/features/notifications/hooks/useNotifications";
import {
  jobsApi,
  type CreateJobInput,
  type JobListParams,
  type RepostJobInput,
  type UpdateJobInput,
} from "../api/jobs.api";
import type { Job } from "../types/job.types";

/** Temporary stale-cache guard; the backend applies the same rules authoritatively. */
export function isGloballyVisibleJob(job: Job, now = Date.now()) {
  return job.status === "active" && new Date(job.date).getTime() > now;
}

export function useJobs(params: JobListParams) {
  return useQuery({
    queryKey: ["jobs", "list", params],
    queryFn: () => jobsApi.list(params),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobsApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories", "list"],
    queryFn: () => jobsApi.listCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => jobsApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateJobInput) => jobsApi.update(jobId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", jobId] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useRepostJob(originalJobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RepostJobInput) => jobsApi.repost(originalJobId, input),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({
        queryKey: ["jobs", "detail", originalJobId],
      });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", job._id] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "mine", "posted"] });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useCompleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.complete(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useReportProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...input }: { jobId: string; reason: "cancel" | "address_not_found" | "no_show" | "other"; note?: string }) =>
      jobsApi.reportProblem(jobId, input),
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", input.jobId] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useMyPostedJobs() {
  return useQuery({
    queryKey: ["jobs", "mine", "posted"],
    queryFn: () => jobsApi.listMinePosted(),
  });
}

export function useMyAssignedJobs() {
  return useQuery({
    queryKey: ["jobs", "mine", "assigned"],
    queryFn: () => jobsApi.listMineAssigned(),
  });
}
