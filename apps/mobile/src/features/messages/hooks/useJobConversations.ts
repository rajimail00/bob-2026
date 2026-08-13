import { useQuery } from "@tanstack/react-query";
import { messagesApi } from "../api/messages.api";

/** The job owner's per-applicant conversation list (the NACHRICHTEN tab). */
export function useJobConversations(jobId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", "forJob", jobId],
    queryFn: () => messagesApi.listConversationsForJob(jobId as string),
    enabled: Boolean(jobId),
  });
}
