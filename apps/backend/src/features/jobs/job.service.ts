import type { ClientSession } from "mongoose";
import { AppError } from "../../lib/errors.js";
import { isMongoTransactionConflict, withMongoTransaction } from "../../lib/transactions.js";
import { applicationRepository } from "../applications/application.repository.js";
import type { NotificationDocument } from "../notifications/notification.model.js";
import {
  createNotificationRecord,
  emitCommittedNotification,
} from "../notifications/notification.service.js";
import { ALLOWED_TRANSITIONS, type JobDocument, type JobStatus } from "./job.model.js";
import { jobRepository, type JobEditableUpdates } from "./job.repository.js";
import type {
  CreateJobInput,
  ListJobsQuery,
  RepostJobInput,
  UpdateJobInput,
} from "./job.validation.js";

type TransitionOptions = {
  assignedWorkerId?: string;
  clearAssignedWorkerId?: boolean;
  session?: ClientSession;
};

type NotificationDelivery = {
  notification: NotificationDocument;
  realtimePayload?: unknown;
};

/** The only write path for job status. Callers must supply the state they observed. */
async function transitionJobStatus(
  jobId: string,
  expectedCurrentStatus: JobStatus,
  nextStatus: JobStatus,
  options: TransitionOptions = {}
) {
  const allowedStatuses: readonly JobStatus[] = ALLOWED_TRANSITIONS[expectedCurrentStatus];
  if (!allowedStatuses.includes(nextStatus)) {
    throw AppError.conflict(
      `Job cannot transition from ${expectedCurrentStatus} to ${nextStatus}.`
    );
  }

  if (nextStatus === "assigned" && !options.assignedWorkerId) {
    throw AppError.conflict("A worker is required before this job can be assigned.");
  }
  if (nextStatus !== "assigned" && options.assignedWorkerId) {
    throw new Error("assignedWorkerId may only be set while assigning a job.");
  }

  const updatedJob = await jobRepository.transitionStatus(
    jobId,
    expectedCurrentStatus,
    nextStatus,
    {
      assignedWorkerId: options.assignedWorkerId,
      clearAssignedWorkerId: options.clearAssignedWorkerId,
    },
    options.session
  );

  if (!updatedJob) {
    const existingJob = await jobRepository.findRawById(jobId, options.session);
    if (!existingJob) throw AppError.notFound("This job no longer exists.");
    throw AppError.conflict("The job status changed while this request was being processed.");
  }

  return updatedJob;
}

async function emitDeliveries(deliveries: NotificationDelivery[]) {
  await Promise.all(
    deliveries.map(({ notification, realtimePayload }) =>
      emitCommittedNotification(notification, realtimePayload)
    )
  );
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

  async repost(originalJobId: string, requesterId: string, input: RepostJobInput) {
    const source = await jobRepository.findRawById(originalJobId);
    assertRepostAllowed(source, requesterId);

    let result;
    try {
      result = await withMongoTransaction(async (session) => {
        // Re-check policy inside the transaction. Terminal source jobs are immutable, but this
        // also keeps authorization and creation in one consistent workflow if that changes later.
        const currentSource = await jobRepository.findRawById(originalJobId, session);
        assertRepostAllowed(currentSource, requesterId);

        const newJob = await jobRepository.create(
          buildRepostedJob(currentSource!, requesterId, originalJobId, input),
          session
        );
        const newJobId = newJob._id.toString();
        const notification = await createNotificationRecord(
          {
            recipientId: requesterId,
            type: "job_reposted",
            data: { jobId: newJobId, originalJobId },
          },
          session
        );

        return { newJobId, notification };
      });
    } catch (error) {
      if (isMongoTransactionConflict(error)) {
        throw AppError.conflict("The source job changed while it was being reposted.");
      }
      throw error;
    }

    await emitCommittedNotification(result.notification, {
      jobId: result.newJobId,
      originalJobId,
    });
    const populatedJob = await jobRepository.findById(result.newJobId);
    if (!populatedJob) throw new Error("The reposted job could not be loaded after creation.");
    return populatedJob;
  },

  async update(jobId: string, requesterId: string, input: UpdateJobInput) {
    const existingJob = await jobRepository.findRawById(jobId);
    if (!existingJob) throw AppError.notFound("This job no longer exists.");
    if (existingJob.clientId.toString() !== requesterId) {
      throw AppError.forbidden("Only the job owner can edit this job.");
    }
    if (existingJob.status !== "draft" && existingJob.status !== "active") {
      throw AppError.conflict("This job can no longer be edited.");
    }

    const expectedStatus = existingJob.status;
    const updates = normalizeEditableUpdates(input);
    let result;
    try {
      result = await withMongoTransaction(async (session) => {
        // Re-read inside the transaction so retries can detect a repeated/no-op save and so a
        // lifecycle change that won the race is never overwritten by stale form data.
        const currentJob = await jobRepository.findRawById(jobId, session);
        if (!currentJob) throw AppError.notFound("This job no longer exists.");
        if (currentJob.clientId.toString() !== requesterId) {
          throw AppError.forbidden("Only the job owner can edit this job.");
        }
        if (currentJob.status !== expectedStatus) {
          throw AppError.conflict("This job can no longer be edited.");
        }
        if (!hasMeaningfulChanges(currentJob, updates)) {
          return { job: null, deliveries: [] as NotificationDelivery[] };
        }

        const job = await jobRepository.updateEditable(
          jobId,
          requesterId,
          expectedStatus,
          updates,
          session
        );
        if (!job) {
          throw AppError.conflict("This job can no longer be edited.");
        }

        const deliveries: NotificationDelivery[] = [];
        if (expectedStatus === "active") {
          const affectedApplications = await applicationRepository.listAffectedByJobUpdate(
            jobId,
            session
          );
          const workerIds = new Set(
            affectedApplications.map((application) => application.workerId.toString())
          );
          workerIds.delete(requesterId);

          for (const workerId of workerIds) {
            const notification = await createNotificationRecord(
              {
                recipientId: workerId,
                type: "job_updated",
                data: { jobId, workerId },
              },
              session
            );
            deliveries.push({ notification, realtimePayload: { jobId } });
          }
        }

        return { job, deliveries };
      });
    } catch (error) {
      if (isMongoTransactionConflict(error)) {
        throw AppError.conflict("This job changed while your edits were being saved.");
      }
      throw error;
    }

    if (!result.job) {
      const unchangedJob = await jobRepository.findById(jobId);
      if (!unchangedJob) throw AppError.notFound("This job no longer exists.");
      return unchangedJob;
    }

    await emitDeliveries(result.deliveries);
    return result.job;
  },

  async listPostedBy(clientId: string) {
    const jobs = await jobRepository.listPostedBy(clientId);
    const pendingCounts = await applicationRepository.countPendingGroupedByJob(
      jobs.map((job) => job._id.toString())
    );
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
    if (job.clientId.toString() !== clientId) {
      throw AppError.forbidden("This job belongs to someone else.");
    }
    return job;
  },

  async complete(jobId: string, clientId: string) {
    const existingJob = await this.assertOwner(jobId, clientId);
    const expectedStatus = existingJob.status as JobStatus;
    const workerId = existingJob.assignedWorkerId?.toString();

    if (expectedStatus === "assigned" && !workerId) {
      throw AppError.conflict("This assigned job has no worker and cannot be completed.");
    }

    let result;
    try {
      result = await withMongoTransaction(async (session) => {
        if (workerId) {
          const acceptedApplication = await applicationRepository.findAcceptedForJob(
            jobId,
            workerId,
            session
          );
          if (!acceptedApplication) {
            throw AppError.conflict(
              "This job has no accepted application and cannot be completed."
            );
          }
        }
        const job = await transitionJobStatus(jobId, expectedStatus, "completed", { session });
        const deliveries: NotificationDelivery[] = [];

        if (workerId) {
          const notification = await createNotificationRecord(
            {
              recipientId: workerId,
              type: "job_completed",
              data: { jobId, workerId },
            },
            session
          );
          deliveries.push({ notification, realtimePayload: { jobId } });
        }

        return { job, deliveries };
      });
    } catch (error) {
      if (isMongoTransactionConflict(error)) {
        throw AppError.conflict("The job was changed by another request.");
      }
      throw error;
    }

    await emitDeliveries(result.deliveries);
    return result.job;
  },

  async cancel(jobId: string, requesterId: string) {
    const existingJob = await jobRepository.findRawById(jobId);
    if (!existingJob) throw AppError.notFound("This job no longer exists.");

    const expectedStatus = existingJob.status as JobStatus;
    const isClient = existingJob.clientId.toString() === requesterId;
    const assignedWorkerId = existingJob.assignedWorkerId?.toString();
    const isAssignedWorker = expectedStatus === "assigned" && assignedWorkerId === requesterId;
    const isRecordedWorker = assignedWorkerId === requesterId;

    if (expectedStatus === "assigned") {
      if (!isClient && !isAssignedWorker) {
        throw AppError.forbidden("This assigned job doesn't belong to you.");
      }
    } else if (["completed", "cancelled", "expired"].includes(expectedStatus)) {
      if (!isClient && !isRecordedWorker) {
        throw AppError.forbidden("This job doesn't belong to you.");
      }
    } else if (!isClient) {
      throw AppError.forbidden("Only the job owner can cancel this job.");
    }

    let result;
    try {
      result = await withMongoTransaction(async (session) => {
        const affectedApplications = await applicationRepository.listAffectedByCancellation(
          jobId,
          session
        );
        const job = await transitionJobStatus(jobId, expectedStatus, "cancelled", {
          clearAssignedWorkerId: expectedStatus !== "assigned",
          session,
        });

        // Cancellation policy: pending/offered applications become rejected. Accepted and
        // declined applications remain unchanged as durable assignment/decision history.
        const rejection = await applicationRepository.rejectOpenApplicationsForCancellation(
          jobId,
          session
        );
        if (rejection.matchedCount !== affectedApplications.length) {
          throw AppError.conflict("Applications changed while the job was being cancelled.");
        }

        const recipientIds = new Set<string>();
        if (isClient) {
          if (expectedStatus === "assigned" && assignedWorkerId) {
            recipientIds.add(assignedWorkerId);
          } else {
            for (const application of affectedApplications) {
              recipientIds.add(application.workerId.toString());
            }
          }
        } else {
          recipientIds.add(existingJob.clientId.toString());
        }
        recipientIds.delete(requesterId);

        const deliveries: NotificationDelivery[] = [];
        for (const recipientId of recipientIds) {
          const notification = await createNotificationRecord(
            {
              recipientId,
              type: "job_cancelled",
              data: { jobId, workerId: isClient ? recipientId : requesterId },
            },
            session
          );
          deliveries.push({ notification, realtimePayload: { jobId } });
        }

        return { job, deliveries };
      });
    } catch (error) {
      if (isMongoTransactionConflict(error)) {
        throw AppError.conflict("The job was changed by another request.");
      }
      throw error;
    }

    await emitDeliveries(result.deliveries);
    return result.job;
  },

  async expirePastDue(now: Date) {
    const candidates = await jobRepository.findPastDueActive(now);
    const expiredJobIds: string[] = [];

    for (const candidate of candidates) {
      const jobId = candidate._id.toString();
      let result;
      try {
        result = await withMongoTransaction(async (session) => {
          const applications = await applicationRepository.listAffectedByExpiration(jobId, session);
          await transitionJobStatus(jobId, "active", "expired", { session });

          const recipientIds = new Set<string>([
            candidate.clientId.toString(),
            ...applications.map((application) => application.workerId.toString()),
          ]);
          const deliveries: NotificationDelivery[] = [];
          for (const recipientId of recipientIds) {
            const notification = await createNotificationRecord(
              { recipientId, type: "job_expired", data: { jobId } },
              session
            );
            deliveries.push({ notification, realtimePayload: { jobId } });
          }

          return { deliveries };
        });
      } catch (error) {
        // Another lifecycle request or scheduler instance won the conditional transition.
        if (
          (error instanceof AppError && error.code === "CONFLICT") ||
          isMongoTransactionConflict(error)
        ) {
          continue;
        }
        throw error;
      }

      await emitDeliveries(result.deliveries);
      expiredJobIds.push(jobId);
    }

    return { expiredCount: expiredJobIds.length, jobIds: expiredJobIds };
  },

  async remove(jobId: string, clientId: string) {
    const job = await this.assertOwner(jobId, clientId);
    if (
      job.status === "assigned" ||
      job.status === "completed" ||
      job.status === "offer_pending"
    ) {
      throw AppError.conflict(
        "This job is in progress and can't be deleted. Cancel or complete it first."
      );
    }

    await applicationRepository.deleteForJob(jobId);
    await jobRepository.deleteById(jobId);
  },
};

function normalizeEditableUpdates(input: UpdateJobInput): JobEditableUpdates {
  const updates: JobEditableUpdates = {};
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.media !== undefined) updates.media = input.media;
  if (input.location !== undefined) {
    updates.location = {
      type: "Point",
      coordinates: [input.location.lng, input.location.lat],
    };
  }
  if (input.address !== undefined) updates.address = input.address;
  if (input.date !== undefined) updates.date = input.date;
  if (input.peopleNeeded !== undefined) updates.peopleNeeded = input.peopleNeeded;
  if (input.budget !== undefined) updates.budget = input.budget;
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
  if (input.isEmergency !== undefined) updates.isEmergency = input.isEmergency;
  if (input.paymentPreference !== undefined) {
    updates.paymentPreference = input.paymentPreference;
  }
  return updates;
}

function hasMeaningfulChanges(job: JobDocument, updates: JobEditableUpdates) {
  if (updates.categoryId !== undefined && job.categoryId.toString() !== updates.categoryId) return true;
  if (updates.title !== undefined && job.title !== updates.title) return true;
  if (updates.description !== undefined && job.description !== updates.description) return true;
  if (
    updates.media !== undefined &&
    JSON.stringify(job.media.map(({ url, type }) => ({ url, type }))) !== JSON.stringify(updates.media)
  ) {
    return true;
  }
  if (
    updates.location !== undefined &&
    (!job.location ||
      job.location.coordinates[0] !== updates.location.coordinates[0] ||
      job.location.coordinates[1] !== updates.location.coordinates[1])
  ) {
    return true;
  }
  if (updates.address !== undefined && job.address !== updates.address) return true;
  if (updates.date !== undefined && job.date.getTime() !== updates.date.getTime()) return true;
  if (updates.peopleNeeded !== undefined && job.peopleNeeded !== updates.peopleNeeded) return true;
  if (updates.budget !== undefined && job.budget !== updates.budget) return true;
  if (updates.recurrence !== undefined && job.recurrence !== updates.recurrence) return true;
  if (updates.isEmergency !== undefined && job.isEmergency !== updates.isEmergency) return true;
  if (
    updates.paymentPreference !== undefined &&
    job.paymentPreference !== updates.paymentPreference
  ) {
    return true;
  }
  return false;
}

const REPOSTABLE_STATUSES: readonly JobStatus[] = ["completed", "cancelled", "expired"];

function assertRepostAllowed(
  job: JobDocument | null,
  requesterId: string
): asserts job is JobDocument {
  if (!job) throw AppError.notFound("This job no longer exists.");
  if (job.clientId.toString() !== requesterId) {
    throw AppError.forbidden("Only the job owner can repost this job.");
  }
  if (!REPOSTABLE_STATUSES.includes(job.status as JobStatus)) {
    throw AppError.conflict("This job cannot be reposted.");
  }
}

function buildRepostedJob(
  source: JobDocument,
  ownerId: string,
  originalJobId: string,
  input: RepostJobInput
) {
  const sourceCoordinates = source.location?.coordinates as number[] | undefined;
  if (!sourceCoordinates || sourceCoordinates.length < 2) {
    throw new Error("The source job has no valid location to copy.");
  }
  return {
    clientId: ownerId,
    categoryId: input.categoryId ?? source.categoryId,
    title: input.title ?? source.title,
    description: input.description ?? source.description,
    media:
      input.media ?? source.media.map(({ url, type }) => ({ url, type })),
    location: input.location
      ? { type: "Point", coordinates: [input.location.lng, input.location.lat] }
      : { type: "Point", coordinates: [sourceCoordinates[0], sourceCoordinates[1]] },
    address: input.address ?? source.address,
    date: input.date,
    peopleNeeded: input.peopleNeeded ?? source.peopleNeeded,
    budget: input.budget ?? source.budget,
    recurrence: input.recurrence ?? source.recurrence,
    isEmergency: input.isEmergency ?? source.isEmergency,
    paymentPreference: input.paymentPreference ?? source.paymentPreference,
    status: "active",
    repostedFromJobId: originalJobId,
  };
}
