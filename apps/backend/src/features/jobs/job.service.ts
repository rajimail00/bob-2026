import { Types } from "mongoose";
import { AppError } from "../../lib/errors.js";
import { notifyUser } from "../../lib/socket.js";
import { applicationRepository } from "../applications/application.repository.js";
import { jobRepository } from "./job.repository.js";
import type { CreateJobInput, ListJobsQuery } from "./job.validation.js";

export const jobService = {
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
    const job = await this.assertOwner(jobId, clientId);
    if (job.status !== "active") throw AppError.conflict("This job is no longer accepting applicants.");

    job.status = "offer_pending";
    await job.save();
    return job;
  },

  /** The worker accepted the offer — the job is now theirs to do. */
  async assignWorker(jobId: string, workerId: string) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "offer_pending") throw AppError.conflict("This job isn't awaiting a response.");

    job.status = "assigned";
    job.assignedWorkerId = new Types.ObjectId(workerId);
    await job.save();
    return job;
  },

  /** The worker declined — reopen the job so the client can offer it to someone else. */
  async reopenAfterDecline(jobId: string) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");
    if (job.status !== "offer_pending") throw AppError.conflict("This job isn't awaiting a response.");

    job.status = "active";
    await job.save();
    return job;
  },

  async complete(jobId: string, clientId: string) {
    const job = await this.assertOwner(jobId, clientId);
    if (job.status !== "assigned") throw AppError.conflict("This job isn't in progress.");

    job.status = "completed";
    await job.save();
    return job;
  },

  /** Either side can cancel once an offer is out or the job is in progress — e.g. the worker
   * can't make it, or the address turned out to be wrong. */
  async cancel(jobId: string, requesterId: string) {
    const job = await jobRepository.findRawById(jobId);
    if (!job) throw AppError.notFound("This job no longer exists.");

    const isClient = job.clientId.toString() === requesterId;
    const isAssignedWorker = job.assignedWorkerId?.toString() === requesterId;
    if (!isClient && !isAssignedWorker) throw AppError.forbidden("This job doesn't belong to you.");
    if (job.status !== "offer_pending" && job.status !== "assigned") {
      throw AppError.conflict("This job can't be cancelled from its current state.");
    }

    job.status = "cancelled";
    await job.save();

    const otherPartyId = isClient ? job.assignedWorkerId?.toString() : job.clientId.toString();
    if (otherPartyId) notifyUser(otherPartyId, "job:cancelled", { jobId });

    return job;
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
