import mongoose, { type ClientSession, type SortOrder } from "mongoose";
import { UserModel } from "../auth/auth.model.js";
import { JobModel } from "../jobs/job.model.js";
import { ApplicationModel } from "../applications/application.model.js";
import { MessageModel } from "../messages/message.model.js";
import { ReviewModel } from "../reviews/review.model.js";
import { ProblemReportModel } from "../problems/problem.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { ActivityModel } from "./activity.model.js";
import { AdminAuditModel } from "./adminAudit.model.js";
import { FaqModel } from "./faq.model.js";
import { AdminConfigModel } from "./adminConfig.model.js";
import { AdminNotificationModel } from "./adminNotification.model.js";
import type { AdminJobsQuery, AdminUserJobsQuery, AdminUsersQuery, TicketsQuery } from "./admin.validation.js";

const SAFE_USER_FIELDS = "email role locale firstName lastName photoUrl phone bio rating workerProfile subscriptionTier status isEmailVerified createdAt updatedAt";

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const adminRepository = {
  async listUsers(query: AdminUsersQuery) {
    const filter: Record<string, unknown> = { status: { $ne: "deleted" } };
    if (query.status) filter.status = query.status;
    if (query.type === "admin") filter.role = "admin";
    else filter.role = { $ne: "admin" };
    if (query.type === "worker") filter.$and = [{ $or: [{ role: "worker" }, { workerProfile: { $exists: true } }] }];
    if (query.type === "client") filter.$and = [{ role: "client" }, { workerProfile: { $exists: false } }];
    if (query.search) {
      const term = escaped(query.search);
      const existingAnd = (filter.$and as Record<string, unknown>[] | undefined) ?? [];
      filter.$and = [...existingAnd, { $or: [
        { email: { $regex: term, $options: "i" } },
        { firstName: { $regex: term, $options: "i" } },
        { lastName: { $regex: term, $options: "i" } },
      ] }];
    }
    const sort: Record<string, SortOrder> = query.sort === "name_asc" ? { firstName: 1, lastName: 1 }
      : query.sort === "name_desc" ? { firstName: -1 as const, lastName: -1 as const }
      : query.sort === "oldest" ? { createdAt: 1 as const }
      : query.sort === "recent_activity" ? { updatedAt: -1 as const }
      : { createdAt: -1 as const };
    const skip = (query.page - 1) * query.pageSize;
    const itemsPromise = query.sort === "recent_activity"
      ? UserModel.aggregate([
          { $match: filter },
          { $lookup: { from: ActivityModel.collection.name, localField: "_id", foreignField: "userId", as: "activity" } },
          { $addFields: { lastActivityAt: { $max: "$activity.lastSeenAt" } } },
          { $sort: { lastActivityAt: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: query.pageSize },
          { $project: { passwordHash: 0, refreshTokenVersion: 0, emailVerificationCodeHash: 0, emailVerificationExpiresAt: 0, activity: 0 } },
        ])
      : UserModel.find(filter).select(SAFE_USER_FIELDS).sort(sort).skip(skip).limit(query.pageSize).lean();
    const [items, total] = await Promise.all([
      itemsPromise,
      UserModel.countDocuments(filter),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  findUser(id: string) {
    return UserModel.findById(id).select(SAFE_USER_FIELDS).lean();
  },

  updateUserStatus(id: string, status: "active" | "banned") {
    return UserModel.findOneAndUpdate(
      { _id: id, status: { $ne: "deleted" } },
      { $set: { status }, $inc: { refreshTokenVersion: 1 } },
      { new: true }
    ).select(SAFE_USER_FIELDS).lean();
  },

  updateUserRole(id: string, role: "client" | "worker" | "admin") {
    return UserModel.findOneAndUpdate(
      { _id: id, status: { $ne: "deleted" } },
      { $set: { role }, $inc: { refreshTokenVersion: 1 } },
      { new: true }
    ).select(SAFE_USER_FIELDS).lean();
  },

  async listJobs(query: AdminJobsQuery) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.moderationStatus) filter.moderationStatus = query.moderationStatus;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.emergency !== undefined) filter.isEmergency = query.emergency;
    if (query.createdFrom || query.createdTo) filter.createdAt = { ...(query.createdFrom ? { $gte: query.createdFrom } : {}), ...(query.createdTo ? { $lte: query.createdTo } : {}) };
    if (query.scheduledFrom || query.scheduledTo) filter.date = { ...(query.scheduledFrom ? { $gte: query.scheduledFrom } : {}), ...(query.scheduledTo ? { $lte: query.scheduledTo } : {}) };
    if (query.search) {
      const term = escaped(query.search);
      const ownerIds = await UserModel.find({ $or: [{ email: { $regex: term, $options: "i" } }, { firstName: { $regex: term, $options: "i" } }, { lastName: { $regex: term, $options: "i" } }] }).distinct("_id");
      const conditions: Record<string, unknown>[] = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { clientId: { $in: ownerIds } },
      ];
      if (mongoose.isValidObjectId(query.search)) conditions.push({ _id: query.search });
      filter.$or = conditions;
    }
    const sort: Record<string, SortOrder> = query.sort === "oldest" ? { createdAt: 1 }
      : query.sort === "scheduled_asc" ? { date: 1 as const }
      : query.sort === "scheduled_desc" ? { date: -1 as const }
      : { createdAt: -1 as const };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      JobModel.find(filter).sort(sort).skip(skip).limit(query.pageSize)
        .populate("clientId", "firstName lastName email photoUrl")
        .populate("assignedWorkerId", "firstName lastName email photoUrl")
        .populate("categoryId").lean(),
      JobModel.countDocuments(filter),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  findJob(id: string) {
    return JobModel.findById(id)
      .populate("clientId", "firstName lastName email photoUrl rating")
      .populate("assignedWorkerId", "firstName lastName email photoUrl rating")
      .populate("categoryId").lean();
  },

  updateModeration(id: string, expected: string, next: string, adminId: string, reason?: string) {
    return JobModel.findOneAndUpdate(
      { _id: id, moderationStatus: expected === "approved" ? { $in: ["approved", null] } : expected },
      {
        $set: { moderationStatus: next },
        $push: { moderationHistory: { from: expected, to: next, adminId, reason, createdAt: new Date() } },
      },
      { new: true, runValidators: true }
    ).lean();
  },

  async listTickets(query: TicketsQuery) {
    const filter: Record<string, unknown> = {};
    if (query.status === "open") filter.$and = [{ $or: [{ status: "open" }, { status: { $exists: false } }] }];
    else if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.reason) filter.reason = query.reason;
    if (query.assignedAdminId) filter.assignedAdminId = query.assignedAdminId;
    if (query.search) {
      const term = escaped(query.search);
      filter.$or = [{ note: { $regex: term, $options: "i" } }, { resolutionNote: { $regex: term, $options: "i" } }];
    }
    const prioritySort: Record<string, SortOrder> = query.sort === "priority" ? { priorityRank: -1, updatedAt: -1 }
      : query.sort === "oldest" ? { createdAt: 1 as const }
      : query.sort === "updated" ? { updatedAt: -1 as const }
      : { createdAt: -1 as const };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total, unresolvedCount] = await Promise.all([
      ProblemReportModel.find(filter).sort(prioritySort).skip(skip).limit(query.pageSize)
        .populate("reporterId", "firstName lastName email photoUrl")
        .populate("assignedAdminId", "firstName lastName email photoUrl")
        .populate("jobId", "title status").lean(),
      ProblemReportModel.countDocuments(filter),
      ProblemReportModel.countDocuments({ $or: [{ status: { $in: ["open", "in_progress"] } }, { status: { $exists: false } }] }),
    ]);
    return { items, total, unresolvedCount, page: query.page, pageSize: query.pageSize };
  },

  findTicket(id: string) {
    return ProblemReportModel.findById(id)
      .populate("reporterId", "firstName lastName email photoUrl")
      .populate("assignedAdminId", "firstName lastName email photoUrl")
      .populate("jobId", "title status address")
      .populate("replies.authorId", "firstName lastName email")
      .populate("internalNotes.adminId", "firstName lastName email").lean();
  },

  async getUserStats(id: string) {
    const objectId = new mongoose.Types.ObjectId(id);
    const [jobsPosted, jobsAssigned, jobsCompleted, applications, reviews, tickets, audits] = await Promise.all([
      JobModel.countDocuments({ clientId: objectId }),
      JobModel.countDocuments({ assignedWorkerId: objectId }),
      JobModel.countDocuments({ assignedWorkerId: objectId, status: "completed" }),
      ApplicationModel.countDocuments({ workerId: objectId }),
      ReviewModel.countDocuments({ toUserId: objectId }),
      ProblemReportModel.countDocuments({ reporterId: objectId }),
      AdminAuditModel.find({ targetType: "user", targetId: id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return { jobsPosted, jobsAssigned, jobsCompleted, applications, reviews, tickets, audits };
  },

  async listUserJobs(id: string, query: AdminUserJobsQuery) {
    const relation = query.kind === "offered" ? { clientId: id } : { assignedWorkerId: id };
    const filter: Record<string, unknown> = { ...relation };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const term = escaped(query.search);
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { address: { $regex: term, $options: "i" } },
      ];
    }
    const sort: Record<string, SortOrder> = query.sort === "oldest" ? { createdAt: 1 }
      : query.sort === "scheduled_asc" ? { date: 1 as const }
      : query.sort === "scheduled_desc" ? { date: -1 as const }
      : { createdAt: -1 as const };
    const skip = (query.page - 1) * query.pageSize;
    const related = { $or: [{ clientId: id }, { assignedWorkerId: id }] };
    const [items, total, offered, taken, active, completed] = await Promise.all([
      JobModel.find(filter).sort(sort).skip(skip).limit(query.pageSize)
        .populate("clientId", "firstName lastName email photoUrl")
        .populate("assignedWorkerId", "firstName lastName email photoUrl")
        .populate("categoryId").lean(),
      JobModel.countDocuments(filter),
      JobModel.countDocuments({ clientId: id }),
      JobModel.countDocuments({ assignedWorkerId: id }),
      JobModel.countDocuments({ ...related, status: { $in: ["active", "offer_pending", "assigned"] } }),
      JobModel.countDocuments({ ...related, status: "completed" }),
    ]);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      summary: { offered, taken, active, completed },
    };
  },

  async getJobRelated(id: string) {
    const [applications, messageCount, tickets, audits] = await Promise.all([
      ApplicationModel.find({ jobId: id }).populate("workerId", "firstName lastName email photoUrl").lean(),
      MessageModel.countDocuments({ jobId: id }),
      ProblemReportModel.find({ jobId: id }).select("reason status priority createdAt").lean(),
      AdminAuditModel.find({ targetType: "job", targetId: id }).sort({ createdAt: -1 }).limit(30).lean(),
    ]);
    return { applications, messageCount, tickets, audits };
  },

  createAudit(data: { adminId: string; action: string; targetType: string; targetId: string; before?: unknown; after?: unknown }, session?: ClientSession) {
    if (session) return AdminAuditModel.create([data], { session }).then(([audit]) => audit!);
    return AdminAuditModel.create(data);
  },

  listCategories() { return CategoryModel.find().sort({ order: 1 }).lean(); },
  listFaqs(filter: Record<string, unknown>, pageNumber: number, size: number) {
    return Promise.all([
      FaqModel.find(filter).sort({ section: 1, order: 1 }).skip((pageNumber - 1) * size).limit(size).lean(),
      FaqModel.countDocuments(filter),
    ]);
  },
  listConfig() { return AdminConfigModel.find().sort({ key: 1 }).lean(); },
  listNotifications(adminId: string, pageNumber: number, size: number) {
    const filter = { recipientAdminId: adminId };
    return Promise.all([
      AdminNotificationModel.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * size).limit(size).lean(),
      AdminNotificationModel.countDocuments(filter),
      AdminNotificationModel.countDocuments({ ...filter, readAt: { $exists: false } }),
    ]);
  },
};
