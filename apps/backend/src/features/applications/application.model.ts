import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const APPLICATION_STATUSES = ["pending", "offered", "accepted", "declined", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const applicationSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    workerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    voiceNoteUrl: { type: String },
    status: { type: String, enum: APPLICATION_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

// One application per worker per job.
applicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });

export type ApplicationDocument = HydratedDocument<InferSchemaType<typeof applicationSchema>>;
export const ApplicationModel = model("Application", applicationSchema);
