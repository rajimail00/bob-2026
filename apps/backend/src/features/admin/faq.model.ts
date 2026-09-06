import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const localizedTextSchema = new Schema(
  {
    en: { type: String, required: true, trim: true },
    de: { type: String, required: true, trim: true },
    es: { type: String, required: true, trim: true },
    fr: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const faqSchema = new Schema(
  {
    question: { type: localizedTextSchema, required: true },
    answer: { type: localizedTextSchema, required: true },
    section: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

faqSchema.index({ section: 1, order: 1 });
export type FaqDocument = HydratedDocument<InferSchemaType<typeof faqSchema>>;
export const FaqModel = model("Faq", faqSchema);
