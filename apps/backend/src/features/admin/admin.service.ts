import mongoose from "mongoose";
import { AppError } from "../../lib/errors.js";
import { UserModel, type UserRole } from "../auth/auth.model.js";
import { JobModel, type JobModerationStatus } from "../jobs/job.model.js";
import { jobService } from "../jobs/job.service.js";
import { ApplicationModel } from "../applications/application.model.js";
import { ReviewModel } from "../reviews/review.model.js";
import { ProblemReportModel } from "../problems/problem.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { ActivityModel } from "./activity.model.js";
import { FaqModel } from "./faq.model.js";
import { AdminConfigModel } from "./adminConfig.model.js";
import { AdminNotificationModel } from "./adminNotification.model.js";
import { notifyActiveAdmins } from "./adminNotification.service.js";
import { adminRepository } from "./admin.repository.js";
import type { AdminDashboardQuery, AdminJobsQuery, AdminUsersQuery, TicketsQuery } from "./admin.validation.js";

type Period = AdminDashboardQuery["period"];
type TicketPatch = { status?: "open" | "in_progress" | "resolved" | "closed"; priority?: "low" | "normal" | "high" | "urgent"; assignedAdminId?: string | null; resolutionNote?: string };

function periodRange(period: Period, end = new Date()) {
  const duration = period === "day" ? 86_400_000 : period === "week" ? 604_800_000 : period === "month" ? 2_592_000_000 : 31_536_000_000;
  const start = new Date(end.getTime() - duration);
  const previousStart = new Date(start.getTime() - duration);
  return { start, end, previousStart, duration };
}

function comparison(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function countCurrentAndPrevious(
  model: { countDocuments(filter: Record<string, unknown>): Promise<number> },
  base: Record<string, unknown>,
  start: Date,
  end: Date,
  previousStart: Date
) {
  return Promise.all([
    model.countDocuments({ ...base, createdAt: { $gte: start, $lt: end } }),
    model.countDocuments({ ...base, createdAt: { $gte: previousStart, $lt: start } }),
  ]);
}

export const adminService = {
  async dashboard(period: Period) {
    const { start, end, previousStart } = periodRange(period);
    const [totalUsers, usersPair, jobsPair, activeJobs, unresolvedTickets, completedJobs, cancelledJobs, expiredJobs, activityCurrent, activityPrevious, jobSeries, geo] = await Promise.all([
      UserModel.countDocuments({ status: { $ne: "deleted" } }),
      countCurrentAndPrevious(UserModel, { status: { $ne: "deleted" } }, start, end, previousStart),
      countCurrentAndPrevious(JobModel, {}, start, end, previousStart),
      JobModel.countDocuments({ status: { $in: ["active", "offer_pending", "assigned"] } }),
      ProblemReportModel.countDocuments({ $or: [{ status: { $in: ["open", "in_progress"] } }, { status: { $exists: false } }] }),
      JobModel.countDocuments({ status: "completed", createdAt: { $gte: start, $lt: end } }),
      JobModel.countDocuments({ status: "cancelled", createdAt: { $gte: start, $lt: end } }),
      JobModel.countDocuments({ status: "expired", createdAt: { $gte: start, $lt: end } }),
      ActivityModel.find({ bucketStart: { $gte: start, $lt: end } }).lean(),
      ActivityModel.find({ bucketStart: { $gte: previousStart, $lt: start } }).lean(),
      JobModel.aggregate<{ label: string; value: number }>([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: { $dateToString: { format: period === "day" ? "%Y-%m-%dT%H:00:00Z" : "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, value: { $sum: 1 } } },
        { $project: { _id: 0, label: "$_id", value: 1 } },
        { $sort: { label: 1 } },
      ]),
      JobModel.aggregate<{ latitude: number; longitude: number; count: number }>([
        { $match: { "location.coordinates.1": { $type: "number" } } },
        { $group: { _id: { longitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 1] }, latitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 1] } }, count: { $sum: 1 } } },
        { $project: { _id: 0, longitude: "$_id.longitude", latitude: "$_id.latitude", count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ]),
    ]);

    const currentUsers = new Set(activityCurrent.map((item) => item.userId.toString()));
    const previousUsers = new Set(activityPrevious.map((item) => item.userId.toString()));
    const currentSeconds = activityCurrent.reduce((sum, item) => sum + item.activeSeconds, 0);
    const previousSeconds = activityPrevious.reduce((sum, item) => sum + item.activeSeconds, 0);
    const averageMinutes = currentUsers.size ? Math.round((currentSeconds / currentUsers.size / 60) * 10) / 10 : null;
    const previousAverage = previousUsers.size ? previousSeconds / previousUsers.size / 60 : 0;
    const activityMap = new Map<string, Set<string>>();
    for (const entry of activityCurrent) {
      const label = period === "day" ? `${String(entry.bucketStart.getUTCHours()).padStart(2, "0")}:00` : entry.bucketStart.toISOString().slice(0, 10);
      const users = activityMap.get(label) ?? new Set<string>();
      users.add(entry.userId.toString());
      activityMap.set(label, users);
    }
    const activity = [...activityMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, users]) => ({ label, value: users.size }));

    return {
      period,
      timezone: "UTC",
      definitions: {
        activeUser: "Unique authenticated users with at least one recorded request in the selected UTC period.",
        averageTime: "Average privacy-preserving active minutes per active user, with request gaps capped at five minutes.",
        period: "Rolling period ending at request time; comparison uses the immediately preceding equal-length period.",
      },
      metrics: {
        allUsers: { value: totalUsers, comparison: comparison(usersPair[0], usersPair[1]), series: activity },
        activeUsers: { value: currentUsers.size, comparison: comparison(currentUsers.size, previousUsers.size), series: activity },
        averageTime: { value: averageMinutes, comparison: averageMinutes === null ? null : comparison(averageMinutes, previousAverage), series: activity },
        jobPosts: { value: jobsPair[0], comparison: comparison(jobsPair[0], jobsPair[1]), series: jobSeries },
        activeJobs: { value: activeJobs, comparison: null, series: jobSeries },
        supportTickets: { value: unresolvedTickets, comparison: null, series: [] },
      },
      activity,
      geo,
      statusBreakdown: { active: activeJobs, completed: completedJobs, cancelled: cancelledJobs, expired: expiredJobs },
    };
  },

  listUsers(query: AdminUsersQuery) { return adminRepository.listUsers(query); },
  async getUser(id: string) {
    const user = await adminRepository.findUser(id);
    if (!user) throw AppError.notFound("User not found.");
    return { user, stats: await adminRepository.getUserStats(id) };
  },
  async updateUserStatus(adminId: string, id: string, status: "active" | "banned") {
    if (adminId === id) throw AppError.conflict("You cannot change your own account status.");
    const before = await adminRepository.findUser(id);
    if (!before) throw AppError.notFound("User not found.");
    const user = await adminRepository.updateUserStatus(id, status);
    if (!user) throw AppError.notFound("User not found.");
    await adminRepository.createAudit({ adminId, action: status === "banned" ? "user.banned" : "user.activated", targetType: "user", targetId: id, before: { status: before.status }, after: { status } });
    return user;
  },
  async updateUserRole(adminId: string, id: string, role: UserRole) {
    if (adminId === id) throw AppError.conflict("You cannot change your own administrator role.");
    const before = await adminRepository.findUser(id);
    if (!before) throw AppError.notFound("User not found.");
    const user = await adminRepository.updateUserRole(id, role);
    if (!user) throw AppError.notFound("User not found.");
    await adminRepository.createAudit({ adminId, action: "user.role_changed", targetType: "user", targetId: id, before: { role: before.role }, after: { role } });
    return user;
  },
  async bulkUserStatus(adminId: string, ids: string[], status: "active" | "banned") {
    if (ids.includes(adminId)) throw AppError.conflict("Your own account cannot be included in a bulk action.");
    const users = [];
    for (const id of new Set(ids)) users.push(await this.updateUserStatus(adminId, id, status));
    return users;
  },

  async listJobs(query: AdminJobsQuery) {
    const result = await adminRepository.listJobs(query);
    return { ...result, items: result.items.map((job) => ({ ...job, moderationStatus: job.moderationStatus ?? "approved" })) };
  },
  async getJob(id: string) {
    const job = await adminRepository.findJob(id);
    if (!job) throw AppError.notFound("Job not found.");
    return { job: { ...job, moderationStatus: job.moderationStatus ?? "approved", statusHistory: job.statusHistory ?? [], moderationHistory: job.moderationHistory ?? [] }, related: await adminRepository.getJobRelated(id) };
  },
  async moderateJob(adminId: string, id: string, status: JobModerationStatus, reason?: string) {
    const job = await JobModel.findById(id).select("moderationStatus").lean();
    if (!job) throw AppError.notFound("Job not found.");
    const before = job.moderationStatus ?? "approved";
    if (before === status) return this.getJob(id);
    const allowed: Record<JobModerationStatus, readonly JobModerationStatus[]> = {
      pending: ["approved", "rejected"],
      approved: ["suspended"],
      rejected: ["approved"],
      suspended: ["approved"],
    };
    if (!allowed[before].includes(status)) {
      throw AppError.conflict(`Job moderation cannot change from ${before} to ${status}.`);
    }
    const updated = await adminRepository.updateModeration(id, before, status, adminId, reason);
    if (!updated) throw AppError.conflict("The job moderation state changed.");
    await adminRepository.createAudit({ adminId, action: `job.${status}`, targetType: "job", targetId: id, before: { moderationStatus: before }, after: { moderationStatus: status, reason } });
    return this.getJob(id);
  },
  async bulkModerateJobs(adminId: string, ids: string[], status: JobModerationStatus, reason?: string) {
    const jobs = [];
    for (const id of new Set(ids)) jobs.push(await this.moderateJob(adminId, id, status, reason));
    return jobs;
  },
  async cancelJob(adminId: string, id: string) {
    const before = await JobModel.findById(id).select("status").lean();
    if (!before) throw AppError.notFound("Job not found.");
    const job = await jobService.cancel(id, adminId, { asAdmin: true });
    await adminRepository.createAudit({ adminId, action: "job.cancelled", targetType: "job", targetId: id, before: { status: before.status }, after: { status: "cancelled" } });
    return job;
  },

  async listTickets(query: TicketsQuery) {
    const result = await adminRepository.listTickets(query);
    return { ...result, items: result.items.map((ticket) => ({ ...ticket, status: ticket.status ?? "open", priority: ticket.priority ?? "normal", replies: ticket.replies ?? [], internalNotes: ticket.internalNotes ?? [] })) };
  },
  async getTicket(id: string) {
    const ticket = await adminRepository.findTicket(id);
    if (!ticket) throw AppError.notFound("Support ticket not found.");
    const audits = await import("./adminAudit.model.js").then(({ AdminAuditModel }) => AdminAuditModel.find({ targetType: "support_ticket", targetId: id }).sort({ createdAt: -1 }).lean());
    return { ticket: { ...ticket, status: ticket.status ?? "open", priority: ticket.priority ?? "normal", replies: ticket.replies ?? [], internalNotes: ticket.internalNotes ?? [] }, audits };
  },
  async updateTicket(adminId: string, id: string, input: TicketPatch) {
    const ticket = await ProblemReportModel.findById(id);
    if (!ticket) throw AppError.notFound("Support ticket not found.");
    const before = { status: ticket.status, priority: ticket.priority, assignedAdminId: ticket.assignedAdminId?.toString() };
    if (input.status) ticket.status = input.status;
    if (input.priority) {
      ticket.priority = input.priority;
      ticket.priorityRank = { low: 0, normal: 1, high: 2, urgent: 3 }[input.priority];
    }
    if (input.assignedAdminId !== undefined) ticket.assignedAdminId = input.assignedAdminId ? new mongoose.Types.ObjectId(input.assignedAdminId) : undefined;
    if (input.resolutionNote !== undefined) ticket.resolutionNote = input.resolutionNote;
    if (input.status === "resolved" || input.status === "closed") ticket.resolvedAt = ticket.resolvedAt ?? new Date();
    if (input.status === "open" || input.status === "in_progress") ticket.resolvedAt = undefined;
    await ticket.save();
    if (input.priority === "urgent" && before.priority !== "urgent") {
      await notifyActiveAdmins("urgent_ticket", "support_ticket", id);
    }
    await adminRepository.createAudit({ adminId, action: "ticket.updated", targetType: "support_ticket", targetId: id, before, after: input });
    return this.getTicket(id);
  },
  async replyToTicket(adminId: string, id: string, message: string) {
    const ticket = await ProblemReportModel.findByIdAndUpdate(id, { $push: { replies: { authorId: adminId, authorRole: "admin", message, createdAt: new Date() } } }, { new: true });
    if (!ticket) throw AppError.notFound("Support ticket not found.");
    await adminRepository.createAudit({ adminId, action: "ticket.replied", targetType: "support_ticket", targetId: id, after: { replyAdded: true } });
    return this.getTicket(id);
  },
  async addTicketNote(adminId: string, id: string, note: string) {
    const ticket = await ProblemReportModel.findByIdAndUpdate(id, { $push: { internalNotes: { adminId, note, createdAt: new Date() } } }, { new: true });
    if (!ticket) throw AppError.notFound("Support ticket not found.");
    await adminRepository.createAudit({ adminId, action: "ticket.note_added", targetType: "support_ticket", targetId: id, after: { noteAdded: true } });
    return this.getTicket(id);
  },
  async bulkUpdateTickets(adminId: string, ids: string[], input: TicketPatch) {
    const tickets = [];
    for (const id of new Set(ids)) tickets.push(await this.updateTicket(adminId, id, input));
    return tickets;
  },

  listCategories() { return adminRepository.listCategories(); },
  async createCategory(adminId: string, input: Record<string, unknown>) {
    const category = await CategoryModel.create(input);
    await adminRepository.createAudit({ adminId, action: "category.created", targetType: "category", targetId: category.id, after: input });
    return category;
  },
  async updateCategory(adminId: string, id: string, input: Record<string, unknown>) {
    const before = await CategoryModel.findById(id).lean();
    if (!before) throw AppError.notFound("Category not found.");
    const category = await CategoryModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
    await adminRepository.createAudit({ adminId, action: "category.updated", targetType: "category", targetId: id, before, after: input });
    return category;
  },
  async deleteCategory(adminId: string, id: string) {
    if (await JobModel.exists({ categoryId: id })) throw AppError.conflict("This category is used by jobs and cannot be deleted.");
    const category = await CategoryModel.findByIdAndDelete(id);
    if (!category) throw AppError.notFound("Category not found.");
    await adminRepository.createAudit({ adminId, action: "category.deleted", targetType: "category", targetId: id, before: category.toObject() });
  },
  async reorderCategories(adminId: string, items: { id: string; order: number }[]) {
    await CategoryModel.bulkWrite(items.map(({ id, order }) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
    await adminRepository.createAudit({ adminId, action: "category.reordered", targetType: "category", targetId: "bulk", after: { count: items.length } });
    return this.listCategories();
  },

  async listFaqs(query: { page: number; pageSize: number; search?: string; published?: boolean }) {
    const filter: Record<string, unknown> = {};
    if (query.published !== undefined) filter.published = query.published;
    if (query.search) filter.$or = [{ "question.en": { $regex: query.search, $options: "i" } }, { section: { $regex: query.search, $options: "i" } }];
    const [items, total] = await adminRepository.listFaqs(filter, query.page, query.pageSize);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },
  async createFaq(adminId: string, input: Record<string, unknown>) {
    const faq = await FaqModel.create(input);
    await adminRepository.createAudit({ adminId, action: "faq.created", targetType: "faq", targetId: faq.id, after: input });
    return faq;
  },
  async updateFaq(adminId: string, id: string, input: Record<string, unknown>) {
    const faq = await FaqModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
    if (!faq) throw AppError.notFound("FAQ not found.");
    await adminRepository.createAudit({ adminId, action: "faq.updated", targetType: "faq", targetId: id, after: input });
    return faq;
  },
  async deleteFaq(adminId: string, id: string) {
    const faq = await FaqModel.findByIdAndDelete(id);
    if (!faq) throw AppError.notFound("FAQ not found.");
    await adminRepository.createAudit({ adminId, action: "faq.deleted", targetType: "faq", targetId: id, before: faq.toObject() });
  },
  async reorderFaqs(adminId: string, items: { id: string; order: number }[]) {
    await FaqModel.bulkWrite(items.map(({ id, order }) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
    await adminRepository.createAudit({ adminId, action: "faq.reordered", targetType: "faq", targetId: "bulk", after: { count: items.length } });
  },

  async getConfig() {
    const rows = await adminRepository.listConfig();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
  async updateConfig(adminId: string, input: Record<string, string>) {
    for (const [key, value] of Object.entries(input)) await AdminConfigModel.findOneAndUpdate({ key }, { $set: { value, updatedBy: adminId } }, { upsert: true, new: true, runValidators: true });
    await adminRepository.createAudit({ adminId, action: "configuration.updated", targetType: "configuration", targetId: "application", after: { keys: Object.keys(input) } });
    return this.getConfig();
  },

  async listNotifications(adminId: string, page: number, pageSize: number) {
    const [items, total, unreadCount] = await adminRepository.listNotifications(adminId, page, pageSize);
    return { items, total, unreadCount, page, pageSize };
  },
  async markNotificationRead(adminId: string, id: string) {
    const notification = await AdminNotificationModel.findOneAndUpdate({ _id: id, recipientAdminId: adminId }, { $set: { readAt: new Date() } }, { new: true });
    if (!notification) throw AppError.notFound("Notification not found.");
    return notification;
  },
  async markAllNotificationsRead(adminId: string) {
    const result = await AdminNotificationModel.updateMany({ recipientAdminId: adminId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    return { updatedCount: result.modifiedCount };
  },
};
