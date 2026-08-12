import { AppError } from "../../lib/errors.js";
import { jobRepository } from "../jobs/job.repository.js";
import { messageRepository } from "./message.repository.js";
import type { CreateMessageInput } from "./message.validation.js";

async function assertParticipant(jobId: string, userId: string) {
  const job = await jobRepository.findRawById(jobId);
  if (!job) throw AppError.notFound("This job no longer exists.");

  const isClient = job.clientId.toString() === userId;
  const isAssignedWorker = job.assignedWorkerId?.toString() === userId;
  if (!isClient && !isAssignedWorker) {
    throw AppError.forbidden("You're not part of this job's conversation.");
  }
  return job;
}

export const messageService = {
  async send(jobId: string, senderId: string, input: CreateMessageInput) {
    await assertParticipant(jobId, senderId);
    return messageRepository.create({
      jobId,
      senderId,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
    });
  },

  async listForJob(jobId: string, requesterId: string) {
    await assertParticipant(jobId, requesterId);
    return messageRepository.listForJob(jobId);
  },

  /** Used by the socket layer, which authenticates via JWT rather than an Express request. */
  assertParticipant,
};
