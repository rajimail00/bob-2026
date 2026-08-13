import { AppError } from "../../lib/errors.js";
import { notifyUser } from "../../lib/socket.js";
import { authRepository } from "../auth/auth.repository.js";
import { jobRepository } from "../jobs/job.repository.js";
import { jobService } from "../jobs/job.service.js";
import { messageService } from "../messages/message.service.js";
import { applicationRepository } from "./application.repository.js";
import type { CreateApplicationInput } from "./application.validation.js";

export const applicationService = {
  async apply(jobId: string, workerId: string, input: CreateApplicationInput) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "active") throw AppError.conflict("This job is no longer accepting applicants.");
    if (job.clientId.toString() === workerId) throw AppError.badRequest("You can't apply to your own job.");

    const worker = await authRepository.findById(workerId);
    if (!worker?.workerProfile) {
      throw AppError.forbidden("Set up your worker profile before applying to jobs.");
    }

    const existing = await applicationRepository.findByJobAndWorker(jobId, workerId);
    if (existing) throw AppError.conflict("You've already applied to this job.");

    const application = await applicationRepository.create({
      jobId,
      workerId,
      message: input.message,
      voiceNoteUrl: input.voiceNoteUrl,
    });

    notifyUser(job.clientId.toString(), "application:new", { jobId, applicationId: application._id.toString() });

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

  async select(applicationId: string, requesterId: string) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw AppError.notFound("This application no longer exists.");

    await jobService.assignWorker(application.jobId.toString(), requesterId, application.workerId.toString());

    application.status = "selected";
    await application.save();
    await applicationRepository.rejectOtherPending(application.jobId.toString(), applicationId);

    return application;
  },
};
