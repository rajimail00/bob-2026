import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const PROBLEM_REASONS = ["cancel", "address_not_found", "no_show", "other"] as const;
export type ProblemReason = (typeof PROBLEM_REASONS)[number];
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const ticketReplySchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const internalNoteSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const problemReportSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: PROBLEM_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "normal", index: true },
    priorityRank: { type: Number, default: 1, min: 0, max: 3, select: false },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    replies: { type: [ticketReplySchema], default: [] },
    internalNotes: { type: [internalNoteSchema], default: [] },
    resolutionNote: { type: String, trim: true, maxlength: 2000 },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

problemReportSchema.index({ status: 1, priority: 1, updatedAt: -1 });

export type ProblemReportDocument = HydratedDocument<InferSchemaType<typeof problemReportSchema>>;
export const ProblemReportModel = model("ProblemReport", problemReportSchema);
