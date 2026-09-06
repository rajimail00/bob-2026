import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const adminAuditSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, required: true, trim: true, maxlength: 50 },
    targetId: { type: String, required: true, trim: true, maxlength: 100 },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

adminAuditSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
export type AdminAuditDocument = HydratedDocument<InferSchemaType<typeof adminAuditSchema>>;
export const AdminAuditModel = model("AdminAudit", adminAuditSchema);
