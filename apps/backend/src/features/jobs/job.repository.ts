import { JobModel } from "./job.model.js";
import type { ListJobsQuery } from "./job.validation.js";

export const jobRepository = {
  async list(query: ListJobsQuery) {
    const filter: Record<string, unknown> = { status: "active" };

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
  findRawById(id: string) {
    return JobModel.findById(id);
  },

  create(data: Record<string, unknown>) {
    return JobModel.create(data);
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
