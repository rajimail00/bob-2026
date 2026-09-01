import type { ClientSession } from "mongoose";
import { AppError } from "../../lib/errors.js";
import { isMongoTransactionConflict, withMongoTransaction } from "../../lib/transactions.js";
import { authRepository } from "../auth/auth.repository.js";
import { jobRepository } from "../jobs/job.repository.js";
import { jobService } from "../jobs/job.service.js";
import { messageService } from "../messages/message.service.js";
import {
  createNotificationRecord,
  emitCommittedNotification,
} from "../notifications/notification.service.js";
import { applicationRepository } from "./application.repository.js";
import type { CreateApplicationInput } from "./application.validation.js";

async function runLifecycleTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
  conflictMessage: string
) {
  try {
    return await withMongoTransaction(work);
  } catch (error) {
    if (isMongoTransactionConflict(error)) throw AppError.conflict(conflictMessage);
    throw error;
  }
}

export const applicationService = {
  async apply(jobId: string, workerId: string, input: CreateApplicationInput) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "active" || job.date.getTime() <= Date.now()) {
      throw AppError.conflict("This job is no longer accepting applicants.");
    }
    if (job.clientId.toString() === workerId) {
      throw AppError.badRequest("You can't apply to your own job.");
    }

    const worker = await authRepository.findById(workerId);
    if (!worker?.workerProfile) {
      throw AppError.forbidden("Set up your worker profile before applying to jobs.");
    }

    const existing = await applicationRepository.findByJobAndWorker(jobId, workerId);
    if (existing) throw AppError.conflict("You've already applied to this job.");

    let result;
    try {
      result = await runLifecycleTransaction(
        async (session) => {
          const lockedJob = await jobRepository.lockForApplication(jobId, new Date(), session);
          if (!lockedJob) {
            throw AppError.conflict("This job is no longer accepting applicants.");
          }

          const application = await applicationRepository.create(
            {
              jobId,
              workerId,
              message: input.message,
              voiceNoteUrl: input.voiceNoteUrl,
            },
            session
          );
          const notification = await createNotificationRecord(
            {
              recipientId: lockedJob.clientId.toString(),
              type: "new_application",
              data: { jobId, applicationId: application._id.toString(), workerId },
            },
            session
          );

          return { application, notification };
        },
        "This job is no longer accepting applicants."
      );
    } catch (error) {
      if (isDuplicateApplicationError(error)) {
        throw AppError.conflict("You've already applied to this job.");
      }
      throw error;
    }

    await emitCommittedNotification(result.notification, {
      jobId,
      applicationId: result.application._id.toString(),
    });
    return result.application;
  },

  async listForJob(jobId: string, requesterId: string) {
    await jobService.assertOwner(jobId, requesterId);
    return applicationRepository.listForJob(jobId);
  },

  async listMine(workerId: string) {
    const applications = await applicationRepository.listForWorker(workerId);
    const unreadCounts = await messageService.countUnreadForWorkerJobs(
      applications.map((application) => application.jobId._id.toString()),
      workerId
    );
    return applications.map((application) => ({
      ...application.toObject(),
      unreadMessageCount: unreadCounts[application.jobId._id.toString()] ?? 0,
    }));
  },

  /** The provider holds an active job for exactly one pending applicant. */
  async offer(applicationId: string, requesterId: string) {
    const existingApplication = await applicationRepository.findById(applicationId);
    if (!existingApplication) throw AppError.notFound("This application no longer exists.");

    const jobId = existingApplication.jobId.toString();
    await jobService.assertOwner(jobId, requesterId);

    const result = await runLifecycleTransaction(
      async (session) => {
        await jobService.transitionStatus(jobId, "active", "offer_pending", { session });
        const application = await applicationRepository.offerPendingApplication(
          applicationId,
          jobId,
          session
        );
        if (!application) {
          throw AppError.conflict("This application has already been decided.");
        }

        const workerId = application.workerId.toString();
        const notification = await createNotificationRecord(
          {
            recipientId: workerId,
            type: "offer_received",
            data: { jobId, applicationId, workerId },
          },
          session
        );

        return { application, notification };
      },
      "Another offer or job update was completed first."
    );

    await emitCommittedNotification(result.notification, { jobId, applicationId });
    return result.application;
  },

  /** The selected worker atomically accepts or declines an offered application. */
  async respond(applicationId: string, workerId: string, accept: boolean) {
    const existingApplication = await applicationRepository.findById(applicationId);
    if (!existingApplication) throw AppError.notFound("This application no longer exists.");
    if (existingApplication.workerId.toString() !== workerId) {
      throw AppError.forbidden("This offer isn't yours to respond to.");
    }

    const jobId = existingApplication.jobId.toString();
    if (accept) {
      const result = await runLifecycleTransaction(
        async (session) => {
          const job = await jobService.transitionStatus(jobId, "offer_pending", "assigned", {
            assignedWorkerId: workerId,
            session,
          });
          const application = await applicationRepository.acceptOfferedApplication(
            applicationId,
            jobId,
            workerId,
            session
          );
          if (!application) {
            throw AppError.conflict("This application isn't awaiting a response.");
          }

          const rejectedApplications = await applicationRepository.listRejectableOthers(
            jobId,
            applicationId,
            session
          );
          const rejection = await applicationRepository.rejectOtherApplications(
            jobId,
            applicationId,
            session
          );
          if (rejection.matchedCount !== rejectedApplications.length) {
            throw AppError.conflict("Applications changed while the offer was being accepted.");
          }

          const providerNotification = await createNotificationRecord(
            {
              recipientId: job.clientId.toString(),
              type: "offer_accepted",
              data: { jobId, applicationId, workerId },
            },
            session
          );

          const rejectedDeliveries = [];
          for (const rejectedApplication of rejectedApplications) {
            const rejectedWorkerId = rejectedApplication.workerId.toString();
            const notification = await createNotificationRecord(
              {
                recipientId: rejectedWorkerId,
                type: "application_rejected",
                data: {
                  jobId,
                  applicationId: rejectedApplication._id.toString(),
                  workerId: rejectedWorkerId,
                },
              },
              session
            );
            rejectedDeliveries.push({
              notification,
              realtimePayload: {
                jobId,
                applicationId: rejectedApplication._id.toString(),
              },
            });
          }

          return { application, providerNotification, rejectedDeliveries };
        },
        "This offer was already accepted, declined, or otherwise changed."
      );

      await emitCommittedNotification(result.providerNotification, { jobId, applicationId });
      await Promise.all(
        result.rejectedDeliveries.map(({ notification, realtimePayload }) =>
          emitCommittedNotification(notification, realtimePayload)
        )
      );
      return result.application;
    }

    const result = await runLifecycleTransaction(
      async (session) => {
        const application = await applicationRepository.declineOfferedApplication(
          applicationId,
          jobId,
          workerId,
          session
        );
        if (!application) {
          throw AppError.conflict("This application isn't awaiting a response.");
        }

        const job = await jobService.transitionStatus(jobId, "offer_pending", "active", {
          clearAssignedWorkerId: true,
          session,
        });
        const notification = await createNotificationRecord(
          {
            recipientId: job.clientId.toString(),
            type: "offer_declined",
            data: { jobId, applicationId, workerId },
          },
          session
        );

        return { application, notification };
      },
      "This offer was already accepted, declined, or otherwise changed."
    );

    await emitCommittedNotification(result.notification, { jobId, applicationId });
    return result.application;
  },
};

function hasMongoErrorCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function isDuplicateApplicationError(error: unknown): boolean {
  return hasMongoErrorCode(error, 11000);
}
