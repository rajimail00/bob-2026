import { Types, type ClientSession } from "mongoose";
import { ApplicationModel, type ApplicationDocument } from "./application.model.js";

export const applicationRepository = {
  async create(
    data: { jobId: string; workerId: string; message: string; voiceNoteUrl?: string },
    session?: ClientSession
  ): Promise<ApplicationDocument> {
    if (!session) return ApplicationModel.create(data);
    const [application] = await ApplicationModel.create([data], { session });
    if (!application) throw new Error("Application insert returned no document.");
    return application;
  },

  findByJobAndWorker(jobId: string, workerId: string) {
    return ApplicationModel.findOne({ jobId, workerId });
  },

  listForJob(jobId: string) {
    return ApplicationModel.find({ jobId })
      .sort({ createdAt: -1 })
      .populate("workerId", "firstName lastName photoUrl rating");
  },

  listForWorker(workerId: string) {
    return ApplicationModel.find({ workerId })
      .sort({ createdAt: -1 })
      .populate({ path: "jobId", populate: { path: "categoryId" } });
  },

  findById(id: string) {
    return ApplicationModel.findById(id);
  },

  findOfferedForJob(jobId: string) {
    return ApplicationModel.findOne({ jobId, status: "offered" });
  },

  listAffectedByExpiration(jobId: string) {
    return ApplicationModel.find({ jobId, status: { $in: ["pending", "offered"] } }).select("workerId");
  },

  listAffectedByCancellation(jobId: string) {
    return ApplicationModel.find({ jobId, status: { $in: ["pending", "offered"] } }).select("workerId");
  },

  listRejectableOthers(jobId: string, exceptApplicationId: string) {
    return ApplicationModel.find({
      jobId,
      _id: { $ne: exceptApplicationId },
      status: { $in: ["pending", "offered"] },
    });
  },

  /** Once one applicant is accepted, everyone else who was still pending or offered is rejected. */
  async rejectOthers(jobId: string, exceptApplicationId: string) {
    await ApplicationModel.updateMany(
      { jobId, _id: { $ne: exceptApplicationId }, status: { $in: ["pending", "offered"] } },
      { $set: { status: "rejected" } }
    );
  },

  deleteForJob(jobId: string) {
    return ApplicationModel.deleteMany({ jobId });
  },

  async countPendingGroupedByJob(jobIds: string[]): Promise<Record<string, number>> {
    if (jobIds.length === 0) return {};
    const rows = await ApplicationModel.aggregate([
      { $match: { jobId: { $in: jobIds.map((id) => new Types.ObjectId(id)) }, status: "pending" } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id.toString(), row.count as number]));
  },
};
