import { Types } from "mongoose";
import { AppError } from "../../lib/errors.js";
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

  listPostedBy(clientId: string) {
    return jobRepository.listPostedBy(clientId);
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

  async assignWorker(jobId: string, clientId: string, workerId: string) {
    const job = await this.assertOwner(jobId, clientId);
    if (job.status !== "active") throw AppError.conflict("This job is no longer accepting applicants.");

    job.status = "assigned";
    job.assignedWorkerId = new Types.ObjectId(workerId);
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
};
