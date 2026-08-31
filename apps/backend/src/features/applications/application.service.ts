import { AppError } from "../../lib/errors.js";
import mongoose from "mongoose";
import { authRepository } from "../auth/auth.repository.js";
import { jobRepository } from "../jobs/job.repository.js";
import { jobService } from "../jobs/job.service.js";
import { messageService } from "../messages/message.service.js";
import { createNotification } from "../notifications/notification.service.js";
import { applicationRepository } from "./application.repository.js";
import type { CreateApplicationInput } from "./application.validation.js";

export const applicationService = {
  async apply(jobId: string, workerId: string, input: CreateApplicationInput) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "active" || job.date.getTime() <= Date.now()) {
      throw AppError.conflict("This job is no longer accepting applicants.");
    }
    if (job.clientId.toString() === workerId) throw AppError.badRequest("You can't apply to your own job.");

    const worker = await authRepository.findById(workerId);
    if (!worker?.workerProfile) {
      throw AppError.forbidden("Set up your worker profile before applying to jobs.");
    }

    const existing = await applicationRepository.findByJobAndWorker(jobId, workerId);
    if (existing) throw AppError.conflict("You've already applied to this job.");

    const session = await mongoose.startSession();
    let application;
    try {
      application = await session.withTransaction(async () => {
        const lockedJob = await jobRepository.lockForApplication(jobId, new Date(), session);
        if (!lockedJob) {
          throw AppError.conflict("This job is no longer accepting applicants.");
        }

        return applicationRepository.create(
          {
            jobId,
            workerId,
            message: input.message,
            voiceNoteUrl: input.voiceNoteUrl,
          },
          session
        );
      });
    } catch (error) {
      if (isDuplicateApplicationError(error)) {
        throw AppError.conflict("You've already applied to this job.");
      }
      if (isTransactionConflict(error)) {
        throw AppError.conflict("This job is no longer accepting applicants.");
      }
      throw error;
    } finally {
      await session.endSession();
    }

    if (!application) {
      throw AppError.conflict("This job is no longer accepting applicants.");
    }

    await createNotification({
      recipientId: job.clientId.toString(),
      type: "new_application",
      data: { jobId, applicationId: application._id.toString(), workerId },
      realtimePayload: { jobId, applicationId: application._id.toString() },
    });

    return application;
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

  /** Client picks a candidate — the job is held while the worker decides. */
  async offer(applicationId: string, requesterId: string) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw AppError.notFound("This application no longer exists.");
    if (application.status !== "pending") throw AppError.conflict("This application has already been decided.");

    const jobId = application.jobId.toString();
    await jobService.assertOwner(jobId, requesterId);
    await jobService.transitionStatus(jobId, "offer_pending");

    application.status = "offered";
    await application.save();

    await createNotification({
      recipientId: application.workerId.toString(),
      type: "offer_received",
      data: {
        jobId,
        applicationId: application._id.toString(),
        workerId: application.workerId.toString(),
      },
      realtimePayload: {
        jobId,
        applicationId: application._id.toString(),
      },
    });

    return application;
  },

  /** Worker accepts or declines an offer. */
  async respond(applicationId: string, workerId: string, accept: boolean) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw AppError.notFound("This application no longer exists.");
    if (application.workerId.toString() !== workerId) throw AppError.forbidden("This offer isn't yours to respond to.");
    if (application.status !== "offered") throw AppError.conflict("This application isn't awaiting a response.");

    const jobId = application.jobId.toString();
    if (accept) {
      const rejectedApplications = await applicationRepository.listRejectableOthers(jobId, applicationId);
      const job = await jobService.transitionStatus(jobId, "assigned", { assignedWorkerId: workerId });
      application.status = "accepted";
      await application.save();
      await applicationRepository.rejectOthers(jobId, applicationId);

      await createNotification({
        recipientId: job.clientId.toString(),
        type: "offer_accepted",
        data: { jobId, applicationId, workerId },
        realtimePayload: { jobId, applicationId },
      });

      await Promise.all(
        rejectedApplications.map((rejectedApplication) =>
          createNotification({
            recipientId: rejectedApplication.workerId.toString(),
            type: "application_rejected",
            data: {
              jobId,
              applicationId: rejectedApplication._id.toString(),
              workerId: rejectedApplication.workerId.toString(),
            },
            realtimePayload: {
              jobId,
              applicationId: rejectedApplication._id.toString(),
            },
          })
        )
      );
    } else {
      const job = await jobService.transitionStatus(jobId, "active");
      application.status = "declined";
      await application.save();
      await createNotification({
        recipientId: job.clientId.toString(),
        type: "offer_declined",
        data: { jobId, applicationId, workerId },
        realtimePayload: { jobId, applicationId },
      });
    }

    return application;
  },
};

function hasMongoErrorCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function isDuplicateApplicationError(error: unknown): boolean {
  return hasMongoErrorCode(error, 11000);
}

function isTransactionConflict(error: unknown): boolean {
  return hasMongoErrorCode(error, 112) || hasMongoErrorCode(error, 251);
}
