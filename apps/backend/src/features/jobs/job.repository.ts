import type { ClientSession } from "mongoose";
import { JobModel, type JobStatus } from "./job.model.js";
import type { ListJobsQuery, UpdateJobInput } from "./job.validation.js";

type JobTransitionUpdates = {
  assignedWorkerId?: string;
  clearAssignedWorkerId?: boolean;
};

export type JobEditableUpdates = Omit<UpdateJobInput, "location"> & {
  location?: { type: "Point"; coordinates: [number, number] };
};

export const jobRepository = {
  async list(query: ListJobsQuery) {
    const filter: Record<string, unknown> = {
      status: "active",
      // Evaluate this for every request so a job disappears even before the scheduler catches up.
      date: { $gt: new Date() },
    };

    if (query.categoryId) {
      const ids = query.categoryId.split(",").filter(Boolean);
      filter.categoryId = ids.length > 1 ? { $in: ids } : ids[0];
    }
    if (query.peopleNeeded) filter.peopleNeeded = { $gte: query.peopleNeeded };
    if (query.minBudget !== undefined || query.maxBudget !== undefined) {
      filter.budget = {
        ...(query.minBudget !== undefined ? { $gte: query.minBudget } : {}),
        ...(query.maxBudget !== undefined ? { $lte: query.maxBudget } : {}),
      };
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ];
    }
    if (query.lng !== undefined && query.lat !== undefined) {
      filter.location = {
        $geoWithin: {
          $centerSphere: [[query.lng, query.lat], query.radiusKm / 6378.1],
        },
      };
    }

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      JobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).populate("categoryId"),
      JobModel.countDocuments(filter),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  findById(id: string) {
    return JobModel.findById(id).populate("categoryId").populate("clientId", "firstName lastName photoUrl rating");
  },

  /** Unpopulated lookup for internal ownership/status checks — findById's populated clientId
   * is a document, not an ObjectId, so `.toString()`/equality comparisons against it silently fail. */
  findRawById(id: string, session?: ClientSession) {
    const query = JobModel.findById(id);
    return session ? query.session(session) : query;
  },

  async create(data: Record<string, unknown>, session?: ClientSession) {
    if (!session) return JobModel.create(data);
    const [job] = await JobModel.create([data], { session });
    if (!job) throw new Error("Job insert returned no document.");
    return job;
  },

  updateEditable(
    id: string,
    ownerId: string,
    expectedStatus: "draft" | "active",
    updates: JobEditableUpdates,
    session: ClientSession
  ) {
    return JobModel.findOneAndUpdate(
      { _id: id, clientId: ownerId, status: expectedStatus },
      { $set: updates, $inc: { applicationRevision: 1 } },
      { new: true, runValidators: true, session }
    )
      .populate("categoryId")
      .populate("clientId", "firstName lastName photoUrl rating");
  },

  transitionStatus(
    id: string,
    currentStatus: JobStatus,
    nextStatus: JobStatus,
    updates: JobTransitionUpdates = {},
    session?: ClientSession
  ) {
    const set: Record<string, unknown> = { status: nextStatus };
    if (updates.assignedWorkerId) set.assignedWorkerId = updates.assignedWorkerId;

    return JobModel.findOneAndUpdate(
      { _id: id, status: currentStatus },
      {
        $set: set,
        ...(updates.clearAssignedWorkerId ? { $unset: { assignedWorkerId: 1 } } : {}),
        $inc: { applicationRevision: 1 },
      },
      {
        new: true,
        runValidators: true,
        session,
      }
    );
  },

  lockForApplication(id: string, now: Date, session: ClientSession) {
    return JobModel.findOneAndUpdate(
      { _id: id, status: "active", date: { $gt: now } },
      { $inc: { applicationRevision: 1 } },
      { new: true, session }
    );
  },

  findPastDueActive(now: Date) {
    return JobModel.find({ status: "active", date: { $lt: now } })
      .select("_id clientId")
      .sort({ date: 1 });
  },

  listPostedBy(clientId: string) {
    return JobModel.find({ clientId }).sort({ createdAt: -1 }).populate("categoryId");
  },

  listAssignedTo(workerId: string) {
    return JobModel.find({ assignedWorkerId: workerId }).sort({ createdAt: -1 }).populate("categoryId");
  },

  deleteById(id: string) {
    return JobModel.deleteOne({ _id: id });
  },
};
