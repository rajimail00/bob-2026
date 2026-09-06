import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const adminConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, enum: ["supportEmail", "maintenanceMessage"] },
    value: { type: String, default: "", maxlength: 1000 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type AdminConfigDocument = HydratedDocument<InferSchemaType<typeof adminConfigSchema>>;
export const AdminConfigModel = model("AdminConfig", adminConfigSchema);
