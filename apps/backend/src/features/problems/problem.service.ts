import { AppError } from "../../lib/errors.js";
import { notifyUser } from "../../lib/socket.js";
import { jobRepository } from "../jobs/job.repository.js";
import { jobService } from "../jobs/job.service.js";
import { problemRepository } from "./problem.repository.js";
import type { ReportProblemInput } from "./problem.validation.js";

export const problemService = {
  async report(jobId: string, reporterId: string, input: ReportProblemInput) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");

    const isClient = job.clientId.toString() === reporterId;
    const isAssignedWorker = job.assignedWorkerId?.toString() === reporterId;
    if (!isClient && !isAssignedWorker) throw AppError.forbidden("This job doesn't belong to you.");

    const report = await problemRepository.create({
      jobId,
      reporterId,
      reason: input.reason,
      note: input.note,
    });

    if (input.reason === "cancel") {
      await jobService.cancel(jobId, reporterId);
    }

    const otherPartyId = isClient ? job.assignedWorkerId?.toString() : job.clientId.toString();
    if (otherPartyId) notifyUser(otherPartyId, "job:problem_reported", { jobId, reason: input.reason });

    return report;
  },
};
