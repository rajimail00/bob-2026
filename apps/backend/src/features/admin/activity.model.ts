import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bucketStart: { type: Date, required: true },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    activeSeconds: { type: Number, default: 0, min: 0 },
    requestCount: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, bucketStart: 1 }, { unique: true });
activitySchema.index({ bucketStart: 1 });
export type ActivityDocument = HydratedDocument<InferSchemaType<typeof activitySchema>>;
export const ActivityModel = model("Activity", activitySchema);
