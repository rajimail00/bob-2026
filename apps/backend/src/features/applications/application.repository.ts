import { ApplicationModel } from "./application.model.js";

export const applicationRepository = {
  create(data: { jobId: string; workerId: string; message: string; voiceNoteUrl?: string }) {
    return ApplicationModel.create(data);
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

  async rejectOtherPending(jobId: string, exceptApplicationId: string) {
    await ApplicationModel.updateMany(
      { jobId, _id: { $ne: exceptApplicationId }, status: "pending" },
      { $set: { status: "rejected" } }
    );
  },
};
