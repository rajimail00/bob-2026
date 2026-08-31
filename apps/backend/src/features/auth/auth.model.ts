import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const USER_ROLES = ["client", "worker", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPORTED_LOCALES = ["en", "de", "es", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUBSCRIPTION_TIERS = ["free", "pro", "unlimited"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const NOTIFICATION_PREFERENCE_DEFAULTS = {
  newApplicant: true,
  newMessage: true,
  offers: true,
  applicationUpdates: true,
  jobStatusChanges: true,
  jobEdits: true,
  cancellations: true,
  completions: true,
  // Retained for users created before the expanded preference set.
  jobWon: true,
} as const;

export type NotificationPreferences = {
  [Key in keyof typeof NOTIFICATION_PREFERENCE_DEFAULTS]: boolean;
};

export function normalizeNotificationPreferences(
  preferences: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    ...NOTIFICATION_PREFERENCE_DEFAULTS,
    ...(preferences?.newApplicant !== undefined ? { newApplicant: preferences.newApplicant } : {}),
    ...(preferences?.newMessage !== undefined ? { newMessage: preferences.newMessage } : {}),
    ...(preferences?.offers !== undefined ? { offers: preferences.offers } : {}),
    ...(preferences?.applicationUpdates !== undefined
      ? { applicationUpdates: preferences.applicationUpdates }
      : {}),
    ...(preferences?.jobStatusChanges !== undefined
      ? { jobStatusChanges: preferences.jobStatusChanges }
      : {}),
    ...(preferences?.jobEdits !== undefined ? { jobEdits: preferences.jobEdits } : {}),
    ...(preferences?.cancellations !== undefined ? { cancellations: preferences.cancellations } : {}),
    ...(preferences?.completions !== undefined ? { completions: preferences.completions } : {}),
    ...(preferences?.jobWon !== undefined ? { jobWon: preferences.jobWon } : {}),
  };
}

const workerProfileSchema = new Schema(
  {
    categories: { type: [String], default: [], validate: (v: string[]) => v.length <= 5 },
    serviceHours: { type: String, enum: ["standard", "24h"], default: "standard" },
    completedJobsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const notificationPrefsSchema = new Schema(
  {
    newApplicant: { type: Boolean, default: true },
    newMessage: { type: Boolean, default: true },
    offers: { type: Boolean, default: true },
    applicationUpdates: { type: Boolean, default: true },
    jobStatusChanges: { type: Boolean, default: true },
    jobEdits: { type: Boolean, default: true },
    cancellations: { type: Boolean, default: true },
    completions: { type: Boolean, default: true },
    jobWon: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "client", required: true },
    locale: { type: String, enum: SUPPORTED_LOCALES, default: "en", required: true },

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    photoUrl: { type: String },
    phone: { type: String },
    bio: { type: String, maxlength: 1000 },

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    workerProfile: { type: workerProfileSchema, default: undefined },
    notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
    subscriptionTier: { type: String, enum: SUBSCRIPTION_TIERS, default: "free" },

    status: { type: String, enum: ["active", "banned", "deleted"], default: "active" },
    deletedAt: { type: Date },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },

    // Not select:false: needed on every refresh/logout lookup (via findById), and it's a plain counter, not a secret.
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const UserModel = model("User", userSchema);
