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
    const updatedJob = await transitionJobStatus(jobId, "cancelled");

    const recipientIds = new Set<string>();
    if (isClient) {
      const assignedWorkerId = job.assignedWorkerId?.toString();
      if (assignedWorkerId) {
        recipientIds.add(assignedWorkerId);
      } else {
        const affectedApplications = await applicationRepository.listAffectedByCancellation(jobId);
        for (const application of affectedApplications) {
          recipientIds.add(application.workerId.toString());
        }
      }
    } else {
      recipientIds.add(job.clientId.toString());
    }

    await Promise.all(
      Array.from(recipientIds).map((recipientId) =>
        createNotification({
          recipientId,
          type: "job_cancelled",
          data: { jobId, workerId: isClient ? recipientId : requesterId },
          realtimePayload: { jobId },
        })
      )
    );

    return updatedJob;
  },

  async expirePastDue(now: Date) {
    const candidates = await jobRepository.findPastDueActive(now);
    const expiredJobIds: string[] = [];

    for (const candidate of candidates) {
      const jobId = candidate._id.toString();
      try {
        await transitionJobStatus(jobId, "expired");
      } catch (error) {
        // Another lifecycle request or scheduler instance won the conditional transition.
        if (error instanceof AppError && error.code === "CONFLICT") continue;
        throw error;
      }

      const applications = await applicationRepository.listAffectedByExpiration(jobId);
      const recipientIds = new Set<string>([
        candidate.clientId.toString(),
        ...applications.map((application) => application.workerId.toString()),
      ]);

      await Promise.all(
        Array.from(recipientIds).map((recipientId) =>
          createNotification({
            recipientId,
            type: "job_expired",
            data: { jobId },
            realtimePayload: { jobId },
          })
        )
      );
      expiredJobIds.push(jobId);
    }

    return { expiredCount: expiredJobIds.length, jobIds: expiredJobIds };
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
