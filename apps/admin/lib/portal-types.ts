import type { AdminSessionUser } from "./types";

export type PortalUser = AdminSessionUser;
export type JobStatus = "draft" | "active" | "offer_pending" | "assigned" | "completed" | "cancelled" | "expired";

export interface LocalizedText { en: string; de: string; es: string; fr: string }
export interface Category { _id: string; slug: string; name: LocalizedText; icon: string; imageUrl?: string | null; order: number }
export interface Job {
  _id: string;
  categoryId: Category;
  clientId: string | { _id: string; firstName?: string; lastName?: string; photoUrl?: string; rating?: { average: number; count: number } };
  title: string;
  description: string;
  media: { url: string; type: "photo" | "video" }[];
  location: { type: "Point"; coordinates: [number, number] };
  address: string;
  date: string;
  peopleNeeded: number;
  budget: number;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  isEmergency: boolean;
  paymentPreference: "cash" | "paypal" | "both";
  status: JobStatus;
  assignedWorkerId?: string;
  pendingApplicantsCount?: number;
  createdAt: string;
  updatedAt: string;
}
export interface JobListResponse { items: Job[]; total: number; page: number; pageSize: number }
export interface MyApplication { _id: string; jobId: Job; status: "pending" | "offered" | "accepted" | "declined" | "rejected"; message: string; unreadMessageCount: number; createdAt: string }
export interface JobApplication { _id: string; jobId: string; workerId: { _id: string; firstName?: string; lastName?: string; photoUrl?: string; rating?: { average: number; count: number } }; message: string; status: "pending" | "offered" | "accepted" | "declined" | "rejected"; createdAt: string }
export interface AppNotification { _id: string; type: string; data: { jobId?: string; workerId?: string }; readAt?: string | null; createdAt: string }
export interface NotificationListResponse { items: AppNotification[]; total: number; page: number; pageSize: number; unreadCount: number }

export function localizedName(category: Category, locale = "en") {
  return category.name[locale as keyof LocalizedText] || category.name.en;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
