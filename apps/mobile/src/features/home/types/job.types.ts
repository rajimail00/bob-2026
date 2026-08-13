export interface LocalizedText {
  en: string;
  de: string;
  es: string;
}

export interface Category {
  _id: string;
  slug: string;
  name: LocalizedText;
  icon: string;
  order: number;
}

export interface JobClientSummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  rating?: { average: number; count: number };
}

export type JobStatus = "draft" | "active" | "offer_pending" | "assigned" | "completed" | "cancelled";

interface JobBase {
  _id: string;
  categoryId: Category;
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
  createdAt: string;
  /** Only present on the "my posted jobs" list — applicants awaiting a decision. */
  pendingApplicantsCount?: number;
}

/** Shape returned by list/geo-search and "my jobs" endpoints — clientId is not populated. */
export interface Job extends JobBase {
  clientId: string;
}

/** Shape returned by the single-job detail endpoint — clientId is populated for display. */
export interface JobDetail extends JobBase {
  clientId: JobClientSummary;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}
