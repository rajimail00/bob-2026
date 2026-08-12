import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const USER_ROLES = ["client", "worker", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPORTED_LOCALES = ["en", "de", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUBSCRIPTION_TIERS = ["free", "pro", "unlimited"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

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

    status: { type: String, enum: ["active", "banned"], default: "active" },

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
