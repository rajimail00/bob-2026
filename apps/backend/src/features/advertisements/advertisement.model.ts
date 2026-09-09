import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const ADVERTISEMENT_PLACEMENTS = ["home_list"] as const;
export const ADVERTISEMENT_AUDIENCES = ["all", "free"] as const;
export const ADVERTISEMENT_STATUSES = ["draft", "active", "paused", "archived"] as const;
export const ADVERTISEMENT_EFFECTIVE_STATUSES = ["draft", "scheduled", "active", "paused", "expired", "archived"] as const;

export type AdvertisementPlacement = (typeof ADVERTISEMENT_PLACEMENTS)[number];
export type AdvertisementAudience = (typeof ADVERTISEMENT_AUDIENCES)[number];
export type AdvertisementStatus = (typeof ADVERTISEMENT_STATUSES)[number];
export type AdvertisementEffectiveStatus = (typeof ADVERTISEMENT_EFFECTIVE_STATUSES)[number];

const advertisementMediaSchema = new Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, trim: true, maxlength: 300 },
    mimeType: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const advertisementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    media: { type: advertisementMediaSchema },
    destinationUrl: { type: String, trim: true, maxlength: 2048 },
    placement: { type: String, enum: ADVERTISEMENT_PLACEMENTS, default: "home_list", required: true },
    audience: { type: String, enum: ADVERTISEMENT_AUDIENCES, default: "all", required: true },
    status: { type: String, enum: ADVERTISEMENT_STATUSES, default: "draft", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    priority: { type: Number, default: 0, min: 0, max: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

advertisementSchema.index({ placement: 1, status: 1, startsAt: 1, endsAt: 1, priority: -1 });
advertisementSchema.index({ deletedAt: 1, createdAt: -1 });
advertisementSchema.index({ title: 1 });

export type AdvertisementDocument = HydratedDocument<InferSchemaType<typeof advertisementSchema>>;
export const AdvertisementModel = model("Advertisement", advertisementSchema);
