import type { ClientSession, FilterQuery, UpdateQuery } from "mongoose";
import type { SubscriptionTier } from "../auth/auth.model.js";
import { AdvertisementModel, type AdvertisementDocument, type AdvertisementEffectiveStatus, type AdvertisementStatus } from "./advertisement.model.js";
import type { AdvertisementListQuery, CreateAdvertisementInput, UpdateAdvertisementInput } from "./advertisement.validation.js";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function effectiveStatusFilter(status: AdvertisementEffectiveStatus, now: Date): FilterQuery<AdvertisementDocument> {
  if (status === "scheduled") return { status: "active", startsAt: { $gt: now } };
  if (status === "expired") return { status: "active", endsAt: { $lte: now } };
  if (status === "active") return { status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } };
  return { status };
}

export const advertisementRepository = {
  async create(input: CreateAdvertisementInput, adminId: string, session: ClientSession) {
    const [advertisement] = await AdvertisementModel.create([{ ...input, createdBy: adminId, updatedBy: adminId }], { session });
    return advertisement!;
  },

  async listAdmin(query: AdvertisementListQuery, now = new Date()) {
    const filter: FilterQuery<AdvertisementDocument> = { deletedAt: { $exists: false } };
    if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: "i" };
    if (query.status) Object.assign(filter, effectiveStatusFilter(query.status, now));
    const [items, total] = await Promise.all([
      AdvertisementModel.find(filter).sort({ priority: -1, createdAt: -1, _id: 1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean(),
      AdvertisementModel.countDocuments(filter),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  findAdminById(id: string, session?: ClientSession) {
    return AdvertisementModel.findOne({ _id: id, deletedAt: { $exists: false } }).session(session ?? null);
  },

  async update(id: string, input: UpdateAdvertisementInput, adminId: string, session: ClientSession) {
    const { media, destinationUrl, ...fields } = input;
    const update: UpdateQuery<AdvertisementDocument> = { $set: { ...fields, updatedBy: adminId } };
    if (media !== undefined) {
      if (media === null) update.$unset = { ...(update.$unset ?? {}), media: 1 };
      else update.$set = { ...(update.$set ?? {}), media };
    }
    if (destinationUrl !== undefined) {
      if (destinationUrl === null) update.$unset = { ...(update.$unset ?? {}), destinationUrl: 1 };
      else update.$set = { ...(update.$set ?? {}), destinationUrl };
    }
    return AdvertisementModel.findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, update, { new: true, runValidators: true, session });
  },

  setStatus(id: string, status: AdvertisementStatus, adminId: string, session: ClientSession) {
    return AdvertisementModel.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      { $set: { status, updatedBy: adminId } },
      { new: true, runValidators: true, session }
    );
  },

  softDelete(id: string, adminId: string, session: ClientSession) {
    return AdvertisementModel.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date(), updatedBy: adminId } },
      { new: true, session }
    );
  },

  listActive(placement: "home_list", subscriptionTier: SubscriptionTier, now = new Date()) {
    return AdvertisementModel.find({
      placement,
      status: "active",
      deletedAt: { $exists: false },
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      audience: { $in: subscriptionTier === "free" ? ["all", "free"] : ["all"] },
      media: { $exists: true },
    })
      .select("title description media.type media.url media.mimeType destinationUrl placement audience priority")
      .sort({ priority: -1, createdAt: 1, _id: 1 })
      .lean();
  },

  countMediaReferences(url: string, exceptId: string) {
    // Soft-deleted advertisements are retained for history, so their media still counts as a reference.
    return AdvertisementModel.countDocuments({ _id: { $ne: exceptId }, "media.url": url });
  },
};
