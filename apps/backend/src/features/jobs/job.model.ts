import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const JOB_STATUSES = [
  "draft",
  "active",
  "offer_pending",
  "assigned",
  "completed",
  "cancelled",
  "expired",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const ALLOWED_TRANSITIONS = {
  draft: ["active", "cancelled"],
  active: ["offer_pending", "cancelled", "expired"],
  offer_pending: ["active", "assigned", "cancelled"],
  assigned: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
} as const satisfies Record<JobStatus, readonly JobStatus[]>;

export const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
export const PAYMENT_PREFERENCES = ["cash", "paypal", "both"] as const;

const mediaSchema = new Schema(
  { url: { type: String, required: true }, type: { type: String, enum: ["photo", "video"], required: true } },
  { _id: false }
);

const jobSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    media: { type: [mediaSchema], default: [] },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: { type: String, required: true },

    date: { type: Date, required: true },
    peopleNeeded: { type: Number, default: 1, min: 1 },
    budget: { type: Number, required: true, min: 0 },
    recurrence: { type: String, enum: RECURRENCE_OPTIONS, default: "none" },
    isEmergency: { type: Boolean, default: false },
    paymentPreference: { type: String, enum: PAYMENT_PREFERENCES, default: "cash" },

    status: { type: String, enum: JOB_STATUSES, default: "draft", index: true },
    assignedWorkerId: { type: Schema.Types.ObjectId, ref: "User" },
    repostedFromJobId: { type: Schema.Types.ObjectId, ref: "Job", index: true },
    // Both application creation and lifecycle transitions write this field, forcing MongoDB
    // to serialize concurrent attempts against the same job document.
    applicationRevision: { type: Number, default: 0, min: 0, select: false },
  },
  { timestamps: true }
);

jobSchema.index({ location: "2dsphere" });

export type JobDocument = HydratedDocument<InferSchemaType<typeof jobSchema>>;
export const JobModel = model("Job", jobSchema);
