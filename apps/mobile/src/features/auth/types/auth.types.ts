export type UserRole = "client" | "worker" | "admin";
export type Locale = "en" | "de" | "es" | "fr";
export type SubscriptionTier = "free" | "pro" | "unlimited";

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
  notificationPrefs: { newApplicant: boolean; newMessage: boolean; jobWon: boolean };
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
