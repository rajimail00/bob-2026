import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const localizedTextSchema = new Schema(
  { en: { type: String, required: true }, de: { type: String, required: true }, es: { type: String, required: true } },
  { _id: false }
);

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: localizedTextSchema, required: true },
    icon: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type CategoryDocument = HydratedDocument<InferSchemaType<typeof categorySchema>>;
export const CategoryModel = model("Category", categorySchema);
