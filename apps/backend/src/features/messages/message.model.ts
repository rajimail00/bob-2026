import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const messageSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 2000 },
    attachmentUrl: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true }
);

export type MessageDocument = HydratedDocument<InferSchemaType<typeof messageSchema>>;
export const MessageModel = model("Message", messageSchema);
