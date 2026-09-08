import type { AuthUser } from "@/features/auth/types/auth.types";
import type { JobStatus } from "@/features/home/types/job.types";

export type AdminPeriod = "day" | "week" | "month" | "year";
export type AccountStatus = "active" | "banned" | "deleted";
export type ModerationStatus = "pending" | "approved" | "rejected" | "suspended";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type LocalizedText = { en: string; de: string; es: string; fr: string };

export interface SeriesPoint { label: string; value: number }
export interface Metric { value: number | null; comparison: number | null; series: SeriesPoint[] }
export interface DashboardData {
  period: AdminPeriod;
  timezone: "UTC";
  definitions: { activeUser: string; averageTime: string; period: string };
  metrics: Record<"allUsers" | "activeUsers" | "averageTime" | "jobPosts" | "activeJobs" | "supportTickets", Metric>;
  activity: SeriesPoint[];
  geo: { latitude: number; longitude: number; count: number }[];
  statusBreakdown: { active: number; completed: number; cancelled: number; expired: number };
}

export interface AdminUser extends AuthUser {
  _id: string;
  status: AccountStatus;
  updatedAt: string;
}
export interface UserStats { jobsPosted: number; jobsAssigned: number; jobsCompleted: number; applications: number; reviews: number; tickets: number; audits: AuditEntry[] }

export interface Category { _id: string; slug: string; name: LocalizedText; icon: string; imageUrl?: string | null; order: number; createdAt: string; updatedAt: string }
export interface PersonRef { _id: string; firstName?: string; lastName?: string; email: string; photoUrl?: string }
export interface AdminJob {
  _id: string; title: string; description: string; media: { url: string; type: "photo" | "video" }[];
  clientId: PersonRef; assignedWorkerId?: PersonRef; categoryId: Category; address: string;
  location: { type: "Point"; coordinates: [number, number] }; date: string; createdAt: string; updatedAt: string;
  budget: number; peopleNeeded: number; isEmergency: boolean; status: JobStatus; moderationStatus: ModerationStatus;
  statusHistory: { from: JobStatus; to: JobStatus; actorId?: string; createdAt: string }[];
  moderationHistory: { from: ModerationStatus; to: ModerationStatus; adminId: string; reason?: string; createdAt: string }[];
}
export interface AdminApplication { _id: string; workerId: PersonRef; status: string; message: string; createdAt: string }
export interface AuditEntry { _id: string; action: string; targetType: string; targetId: string; createdAt: string }

export interface Ticket {
  _id: string; reporterId: PersonRef; jobId?: Pick<AdminJob, "_id" | "title" | "status" | "address">;
  reason: "cancel" | "address_not_found" | "no_show" | "other"; note?: string;
  status: TicketStatus; priority: TicketPriority; assignedAdminId?: PersonRef; resolutionNote?: string; resolvedAt?: string;
  replies: { _id: string; authorId: PersonRef; authorRole: "user" | "admin"; message: string; createdAt: string }[];
  internalNotes: { _id: string; adminId: PersonRef; note: string; createdAt: string }[];
  createdAt: string; updatedAt: string;
}

export interface Faq { _id: string; question: LocalizedText; answer: LocalizedText; section: string; order: number; published: boolean; createdAt: string; updatedAt: string }
export interface AdminNotification { _id: string; type: "new_support_ticket" | "urgent_ticket" | "reported_job" | "pending_job_moderation" | "unusual_action"; targetType: string; targetId: string; readAt?: string; createdAt: string }
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; unreadCount?: number; unresolvedCount?: number }

export interface UserQuery { page?: number; pageSize?: number; search?: string; type?: "admin" | "worker" | "client"; status?: Exclude<AccountStatus, "deleted">; sort?: "name_asc" | "name_desc" | "newest" | "oldest" | "recent_activity" }
export interface JobQuery { page?: number; pageSize?: number; search?: string; status?: JobStatus; moderationStatus?: ModerationStatus; categoryId?: string; emergency?: boolean; createdFrom?: string; createdTo?: string; scheduledFrom?: string; scheduledTo?: string; sort?: "newest" | "oldest" | "scheduled_asc" | "scheduled_desc" }
export interface TicketQuery { page?: number; pageSize?: number; search?: string; status?: TicketStatus; priority?: TicketPriority; reason?: Ticket["reason"]; assignedAdminId?: string; sort?: "newest" | "oldest" | "priority" | "updated" }
