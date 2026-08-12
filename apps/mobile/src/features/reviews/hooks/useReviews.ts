import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviews.api";

export function useCreateReview(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stars: number; comment?: string }) => reviewsApi.create(jobId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", "detail", jobId] });
    },
  });
}
