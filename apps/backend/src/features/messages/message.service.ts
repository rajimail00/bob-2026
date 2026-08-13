import { AppError } from "../../lib/errors.js";
import { applicationRepository } from "../applications/application.repository.js";
import { jobRepository } from "../jobs/job.repository.js";
import { jobService } from "../jobs/job.service.js";
import { messageRepository } from "./message.repository.js";
import type { CreateMessageInput } from "./message.validation.js";

async function assertParticipant(jobId: string, workerId: string, userId: string) {
  const job = await jobRepository.findRawById(jobId);
  if (!job) throw AppError.notFound("This job no longer exists.");

  const isClient = job.clientId.toString() === userId;
  const isWorker = workerId === userId;
  if (!isClient && !isWorker) {
    throw AppError.forbidden("You're not part of this conversation.");
  }
  return job;
}

export const messageService = {
  async send(jobId: string, workerId: string, senderId: string, input: CreateMessageInput) {
    await assertParticipant(jobId, workerId, senderId);
    return messageRepository.create({
      jobId,
      workerId,
      senderId,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
    });
  },

  async listForConversation(jobId: string, workerId: string, requesterId: string) {
    await assertParticipant(jobId, workerId, requesterId);
    await messageRepository.markReadForConversation(jobId, workerId, requesterId);
    return messageRepository.listForConversation(jobId, workerId);
  },

  /** The job owner's inbox for a job: one row per applicant they've messaged, most recent first. */
  async listConversationsForJob(jobId: string, clientId: string) {
    await jobService.assertOwner(jobId, clientId);
    const [applications, summaries] = await Promise.all([
      applicationRepository.listForJob(jobId),
      messageRepository.listConversationSummariesForJob(jobId, clientId),
    ]);

    return applications
      .map((application) => {
        const summary = summaries.get(application.workerId._id.toString());
        return {
          workerId: application.workerId._id.toString(),
          worker: application.workerId,
          applicationId: application._id.toString(),
          applicationStatus: application.status,
          previewText: summary?.lastMessageText ?? application.message,
          previewAt: summary?.lastMessageAt ?? application.createdAt,
          unreadCount: summary?.unreadCount ?? 0,
        };
      })
      .sort((a, b) => new Date(b.previewAt).getTime() - new Date(a.previewAt).getTime());
  },

  countUnreadForWorkerJobs(jobIds: string[], workerId: string) {
    return messageRepository.countUnreadForWorkerJobs(jobIds, workerId);
  },

  /** Used by the socket layer, which authenticates via JWT rather than an Express request. */
  assertParticipant,
};
