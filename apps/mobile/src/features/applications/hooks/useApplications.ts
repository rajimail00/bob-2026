import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "../api/applications.api";

export function useApplyToJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { message: string; voiceNoteUrl?: string }) => applicationsApi.apply(jobId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
    },
  });
}

export function useJobApplicants(jobId: string | undefined) {
  return useQuery({
    queryKey: ["applications", "forJob", jobId],
    queryFn: () => applicationsApi.listForJob(jobId as string),
    enabled: Boolean(jobId),
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => applicationsApi.listMine(),
  });
}

export function useOfferApplicant(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => applicationsApi.offer(applicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", "forJob", jobId] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", jobId] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "mine"] });
    },
  });
}

export function useRespondToOffer(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, accept }: { applicationId: string; accept: boolean }) =>
      applicationsApi.respond(applicationId, accept),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", jobId] });
    },
  });
}
