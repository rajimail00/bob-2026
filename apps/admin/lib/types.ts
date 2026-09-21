export type AdminPeriod = "day" | "week" | "month" | "year";
export type AccountStatus = "active" | "banned" | "deleted";
export type UserRole = "client" | "worker" | "admin";
export type JobStatus = "draft" | "active" | "offer_pending" | "assigned" | "completed" | "cancelled" | "expired";
export type ModerationStatus = "pending" | "approved" | "rejected" | "suspended";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type LocalizedText = { en: string; de: string; es: string; fr: string };

export interface AdminSessionUser {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

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

export interface AdminUser extends AdminSessionUser {
  _id: string;
  locale: "en" | "de" | "es" | "fr";
  phone?: string;
  bio?: string;
  rating: { average: number; count: number };
  workerProfile?: { categories: string[]; serviceHours: "standard" | "24h"; completedJobsCount: number };
  subscriptionTier: "free" | "pro" | "unlimited";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry { _id: string; action: string; targetType: string; targetId: string; createdAt: string }
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
export interface Ticket {
  _id: string; reporterId: PersonRef; jobId?: Pick<AdminJob, "_id" | "title" | "status" | "address">;
  reason: "cancel" | "address_not_found" | "no_show" | "other"; note?: string;
  status: TicketStatus; priority: TicketPriority; assignedAdminId?: PersonRef; resolutionNote?: string; resolvedAt?: string;
  replies: { _id: string; authorId: PersonRef; authorRole: "user" | "admin"; message: string; createdAt: string }[];
  internalNotes: { _id: string; adminId: PersonRef; note: string; createdAt: string }[];
  createdAt: string; updatedAt: string;
}
export interface AdminNotification { _id: string; type: "new_support_ticket" | "urgent_ticket" | "reported_job" | "pending_job_moderation" | "unusual_action"; targetType: string; targetId: string; readAt?: string; createdAt: string }
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; unreadCount?: number; unresolvedCount?: number }
export interface AdvertisementMedia { type: "image" | "video"; url: string; publicId?: string; mimeType?: string }
export interface Advertisement {
  _id: string; title: string; description?: string; media?: AdvertisementMedia; destinationUrl?: string;
  placement: "home_list"; audience: "all" | "free"; status: "draft" | "active" | "paused" | "archived";
  effectiveStatus?: "draft" | "active" | "paused" | "archived" | "scheduled" | "expired";
  startsAt?: string; endsAt?: string; priority: number; createdAt?: string; updatedAt?: string;
}
