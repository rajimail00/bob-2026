import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const PROBLEM_REASONS = ["cancel", "address_not_found", "no_show", "other"] as const;
export type ProblemReason = (typeof PROBLEM_REASONS)[number];

const problemReportSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: PROBLEM_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export type ProblemReportDocument = HydratedDocument<InferSchemaType<typeof problemReportSchema>>;
export const ProblemReportModel = model("ProblemReport", problemReportSchema);
