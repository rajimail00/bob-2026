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

  findByJobAndWorker(jobId: string, workerId: string, session?: ClientSession) {
    const query = ApplicationModel.findOne({ jobId, workerId });
    return session ? query.session(session) : query;
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

  findById(id: string, session?: ClientSession) {
    const query = ApplicationModel.findById(id);
    return session ? query.session(session) : query;
  },

  findOfferedForJob(jobId: string) {
    return ApplicationModel.findOne({ jobId, status: "offered" });
  },

  findAcceptedForJob(jobId: string, workerId: string, session?: ClientSession) {
    const query = ApplicationModel.findOne({ jobId, workerId, status: "accepted" });
    return session ? query.session(session) : query;
  },

  listAffectedByExpiration(jobId: string, session?: ClientSession) {
    const query = ApplicationModel.find({ jobId, status: { $in: ["pending", "offered"] } }).select("workerId");
    return session ? query.session(session) : query;
  },

  listAffectedByCancellation(jobId: string, session?: ClientSession) {
    const query = ApplicationModel.find({ jobId, status: { $in: ["pending", "offered"] } }).select("workerId");
    return session ? query.session(session) : query;
  },

  listAffectedByJobUpdate(jobId: string, session: ClientSession) {
    return ApplicationModel.find({
      jobId,
      status: { $in: ["pending", "offered", "accepted"] },
    })
      .select("workerId")
      .session(session);
  },

  listRejectableOthers(jobId: string, exceptApplicationId: string, session?: ClientSession) {
    const query = ApplicationModel.find({
      jobId,
      _id: { $ne: exceptApplicationId },
      status: { $in: ["pending", "offered"] },
    });
    return session ? query.session(session) : query;
  },

  offerPendingApplication(applicationId: string, jobId: string, session: ClientSession) {
    return ApplicationModel.findOneAndUpdate(
      { _id: applicationId, jobId, status: "pending" },
      { $set: { status: "offered" } },
      { new: true, runValidators: true, session }
    );
  },

  acceptOfferedApplication(
    applicationId: string,
    jobId: string,
    workerId: string,
    session: ClientSession
  ) {
    return ApplicationModel.findOneAndUpdate(
      { _id: applicationId, jobId, workerId, status: "offered" },
      { $set: { status: "accepted" } },
      { new: true, runValidators: true, session }
    );
  },

  declineOfferedApplication(
    applicationId: string,
    jobId: string,
    workerId: string,
    session: ClientSession
  ) {
    return ApplicationModel.findOneAndUpdate(
      { _id: applicationId, jobId, workerId, status: "offered" },
      { $set: { status: "declined" } },
      { new: true, runValidators: true, session }
    );
  },

  /** Once one applicant is accepted, everyone else who was still pending or offered is rejected. */
  rejectOtherApplications(jobId: string, exceptApplicationId: string, session: ClientSession) {
    return ApplicationModel.updateMany(
      { jobId, _id: { $ne: exceptApplicationId }, status: { $in: ["pending", "offered"] } },
      { $set: { status: "rejected" } },
      { session }
    );
  },

  /** Cancellation policy: open applications become rejected; accepted/declined history is preserved. */
  rejectOpenApplicationsForCancellation(jobId: string, session: ClientSession) {
    return ApplicationModel.updateMany(
      { jobId, status: { $in: ["pending", "offered"] } },
      { $set: { status: "rejected" } },
      { session }
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
