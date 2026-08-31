export type UserRole = "client" | "worker" | "admin";
export type Locale = "en" | "de" | "es" | "fr";
export type SubscriptionTier = "free" | "pro" | "unlimited";

export interface NotificationPreferences {
  newApplicant: boolean;
  newMessage: boolean;
  offers: boolean;
  applicationUpdates: boolean;
  jobStatusChanges: boolean;
  jobEdits: boolean;
  cancellations: boolean;
  completions: boolean;
  jobWon: boolean;
}

export type EditableNotificationPreference = Exclude<keyof NotificationPreferences, "jobWon">;

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  locale: Locale;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  bio?: string;
  rating: { average: number; count: number };
  workerProfile?: {
    categories: string[];
    serviceHours: "standard" | "24h";
    completedJobsCount: number;
  };
  notificationPrefs: NotificationPreferences;
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
