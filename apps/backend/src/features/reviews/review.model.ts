import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const reviewSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per job per direction (client -> worker, or worker -> client).
reviewSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true });

export type ReviewDocument = HydratedDocument<InferSchemaType<typeof reviewSchema>>;
export const ReviewModel = model("Review", reviewSchema);
