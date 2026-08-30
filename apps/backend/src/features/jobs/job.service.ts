import { ALLOWED_TRANSITIONS, type JobStatus } from "./job.model.js";
import { AppError } from "../../lib/errors.js";
import { applicationRepository } from "../applications/application.repository.js";
import { createNotification } from "../notifications/notification.service.js";
import { jobRepository } from "./job.repository.js";
import type { CreateJobInput, ListJobsQuery } from "./job.validation.js";

type TransitionOptions = {
  assignedWorkerId?: string;
};

async function transitionJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  options: TransitionOptions = {}
) {
  const job = await jobRepository.findRawById(jobId);

  if (!job) {
    throw AppError.notFound("This job no longer exists.");
  }

  const currentStatus = job.status as JobStatus;
  const allowedStatuses: readonly JobStatus[] =
    ALLOWED_TRANSITIONS[currentStatus];

  if (!allowedStatuses.includes(nextStatus)) {
    throw AppError.conflict(
      `Job cannot transition from ${currentStatus} to ${nextStatus}.`
    );
  }

  if (nextStatus === "assigned" && !options.assignedWorkerId) {
    throw new Error(
      "An assignedWorkerId is required when assigning a job."
    );
  }

  const updatedJob = await jobRepository.transitionStatus(
    jobId,
    currentStatus,
    nextStatus,
    options
  );

  // Another request may have changed the status after our first read.
  if (!updatedJob) {
    throw AppError.conflict(
      "The job status changed while this request was being processed."
    );
  }

  return updatedJob;
}

export const jobService = {
  transitionStatus: transitionJobStatus,

  list(query: ListJobsQuery) {
    return jobRepository.list(query);
  },

  async getById(id: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw AppError.notFound("This job no longer exists.");
    return job;
  },

  create(clientId: string, input: CreateJobInput) {
    return jobRepository.create({
      clientId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      media: input.media,
      location: { type: "Point", coordinates: [input.location.lng, input.location.lat] },
      address: input.address,
      date: input.date,
      peopleNeeded: input.peopleNeeded,
      budget: input.budget,
      recurrence: input.recurrence,
      isEmergency: input.isEmergency,
      paymentPreference: input.paymentPreference,
      status: "active",
    });
  },

  async listPostedBy(clientId: string) {
    const jobs = await jobRepository.listPostedBy(clientId);
    const pendingCounts = await applicationRepository.countPendingGroupedByJob(jobs.map((job) => job._id.toString()));
    return jobs.map((job) => ({
      ...job.toObject(),
      pendingApplicantsCount: pendingCounts[job._id.toString()] ?? 0,
    }));
  },

  listAssignedTo(workerId: string) {
    return jobRepository.listAssignedTo(workerId);
  },

  async assertOwner(jobId: string, clientId: string) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.clientId.toString() !== clientId) throw AppError.forbidden("This job belongs to someone else.");
    return job;
  },

  /** The client has picked a candidate — the job is held while the worker decides. */
  async markOfferPending(jobId: string, clientId: string) {
    await this.assertOwner(jobId, clientId);
    return transitionJobStatus(jobId, "offer_pending");
  },

  /** The worker accepted the offer — the job is now theirs to do. */
  async assignWorker(jobId: string, workerId: string) {
    return transitionJobStatus(jobId, "assigned", { assignedWorkerId: workerId });
  },

  /** The worker declined — reopen the job so the client can offer it to someone else. */
  async reopenAfterDecline(jobId: string) {
    return transitionJobStatus(jobId, "active");
  },

  async complete(jobId: string, clientId: string) {
    const job = await this.assertOwner(jobId, clientId);
    const completedJob = await transitionJobStatus(jobId, "completed");
    const workerId = job.assignedWorkerId?.toString();

    if (workerId) {
      await createNotification({
        recipientId: workerId,
        type: "job_completed",
        data: { jobId, workerId },
        realtimePayload: { jobId },
      });
    }

    return completedJob;
  },

  /** Either side can cancel once an offer is out or the job is in progress — e.g. the worker
   * can't make it, or the address turned out to be wrong. */
  async cancel(jobId: string, requesterId: string) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");

    const isClient = job.clientId.toString() === requesterId;
    const isAssignedWorker = job.assignedWorkerId?.toString() === requesterId;
    if (!isClient && !isAssignedWorker) throw AppError.forbidden("This job doesn't belong to you.");
    let otherPartyId = isClient ? job.assignedWorkerId?.toString() : job.clientId.toString();
    if (isClient && !otherPartyId && job.status === "offer_pending") {
      const offeredApplication = await applicationRepository.findOfferedForJob(jobId);
      otherPartyId = offeredApplication?.workerId.toString();
    }

    const updatedJob = await transitionJobStatus(jobId, "cancelled");

    if (otherPartyId) {
      await createNotification({
        recipientId: otherPartyId,
        type: "job_cancelled",
        data: { jobId, workerId: isClient ? otherPartyId : requesterId },
        realtimePayload: { jobId },
      });
    }

    return updatedJob;
  },

  async remove(jobId: string, clientId: string) {
    const job = await this.assertOwner(jobId, clientId);
    if (job.status === "assigned" || job.status === "completed" || job.status === "offer_pending") {
      throw AppError.conflict(
        "This job is in progress and can't be deleted. Cancel or complete it first."
      );
    }

    await applicationRepository.deleteForJob(jobId);
    await jobRepository.deleteById(jobId);
  },
};
