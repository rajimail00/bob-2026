import { withMongoTransaction } from "../../lib/transactions.js";
import { deleteCloudinaryAssetByUrl } from "../../lib/cloudinary.js";
import { AppError } from "../../lib/errors.js";
import { adminRepository } from "../admin/admin.repository.js";
import { UserModel } from "../auth/auth.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { JobModel } from "../jobs/job.model.js";
import { ApplicationModel } from "../applications/application.model.js";
import { MessageModel } from "../messages/message.model.js";
import { advertisementRepository } from "./advertisement.repository.js";
import type { AdvertisementDocument, AdvertisementEffectiveStatus, AdvertisementStatus } from "./advertisement.model.js";
import type { AdvertisementListQuery, CreateAdvertisementInput, UpdateAdvertisementInput } from "./advertisement.validation.js";

function effectiveStatus(advertisement: Pick<AdvertisementDocument, "status" | "startsAt" | "endsAt">, now = new Date()): AdvertisementEffectiveStatus {
  if (advertisement.status !== "active") return advertisement.status;
  if (advertisement.startsAt > now) return "scheduled";
  if (advertisement.endsAt <= now) return "expired";
  return "active";
}

function validateMergedAdvertisement(advertisement: Pick<AdvertisementDocument, "status" | "startsAt" | "endsAt" | "media">) {
  if (advertisement.endsAt <= advertisement.startsAt) throw AppError.badRequest("End time must be after start time.");
  if (advertisement.status === "active" && !advertisement.media) throw AppError.badRequest("Media is required before publishing.");
  if (advertisement.status === "active" && advertisement.endsAt <= new Date()) throw AppError.badRequest("An active advertisement must end in the future.");
}

async function deleteReplacedMediaIfExclusive(url: string | undefined, advertisementId: string) {
  if (!url || await advertisementRepository.countMediaReferences(url, advertisementId)) return;
  const usedElsewhere = await Promise.all([
    JobModel.exists({ "media.url": url }),
    CategoryModel.exists({ imageUrl: url }),
    UserModel.exists({ photoUrl: url }),
    ApplicationModel.exists({ voiceNoteUrl: url }),
    MessageModel.exists({ attachmentUrl: url }),
  ]);
  if (usedElsewhere.some(Boolean)) return;
  try {
    await deleteCloudinaryAssetByUrl(url);
  } catch (error) {
    console.error("[advertisements] old media cleanup failed", error instanceof Error ? error.message : "unknown error");
  }
}

function withEffectiveStatus<T extends { status: AdvertisementStatus; startsAt: Date; endsAt: Date }>(advertisement: T) {
  return { ...advertisement, effectiveStatus: effectiveStatus(advertisement as Pick<AdvertisementDocument, "status" | "startsAt" | "endsAt">) };
}

export const advertisementService = {
  async create(adminId: string, input: CreateAdvertisementInput) {
    const advertisement = await withMongoTransaction(async (session) => {
      const created = await advertisementRepository.create(input, adminId, session);
      await adminRepository.createAudit({ adminId, action: "advertisement.created", targetType: "advertisement", targetId: created.id, after: { title: created.title, status: created.status } }, session);
      return created;
    });
    return withEffectiveStatus(advertisement.toObject());
  },

  async list(query: AdvertisementListQuery) {
    const result = await advertisementRepository.listAdmin(query);
    return { ...result, items: result.items.map(withEffectiveStatus) };
  },

  async get(id: string) {
    const advertisement = await advertisementRepository.findAdminById(id);
    if (!advertisement) throw AppError.notFound("Advertisement not found.");
    return withEffectiveStatus(advertisement.toObject());
  },

  async update(adminId: string, id: string, input: UpdateAdvertisementInput) {
    const result = await withMongoTransaction(async (session) => {
      const before = await advertisementRepository.findAdminById(id, session);
      if (!before) throw AppError.notFound("Advertisement not found.");
      const merged = {
        status: input.status ?? before.status,
        startsAt: input.startsAt ?? before.startsAt,
        endsAt: input.endsAt ?? before.endsAt,
        media: input.media === undefined ? before.media : input.media ?? undefined,
      };
      if (before.status === "archived" && input.status) throw AppError.conflict("Archived advertisements cannot be changed to another status.");
      validateMergedAdvertisement(merged as Pick<AdvertisementDocument, "status" | "startsAt" | "endsAt" | "media">);
      const advertisement = await advertisementRepository.update(id, input, adminId, session);
      if (!advertisement) throw AppError.notFound("Advertisement not found.");
      await adminRepository.createAudit({ adminId, action: "advertisement.updated", targetType: "advertisement", targetId: id, before: { title: before.title, status: before.status }, after: { fields: Object.keys(input) } }, session);
      return { advertisement, oldMediaUrl: before.media?.url, newMediaUrl: advertisement.media?.url };
    });
    if (result.oldMediaUrl && result.oldMediaUrl !== result.newMediaUrl) await deleteReplacedMediaIfExclusive(result.oldMediaUrl, id);
    return withEffectiveStatus(result.advertisement.toObject());
  },

  async changeStatus(adminId: string, id: string, action: "publish" | "pause" | "archive") {
    return withMongoTransaction(async (session) => {
      const before = await advertisementRepository.findAdminById(id, session);
      if (!before) throw AppError.notFound("Advertisement not found.");
      let status: AdvertisementStatus;
      if (action === "publish") {
        if (before.status === "archived") throw AppError.conflict("Archived advertisements cannot be published.");
        if (!before.media) throw AppError.conflict("Add valid media before publishing.");
        if (before.endsAt <= new Date()) throw AppError.conflict("An expired advertisement cannot be published.");
        status = "active";
      } else if (action === "pause") {
        if (before.status !== "active") throw AppError.conflict("Only active advertisements can be paused.");
        status = "paused";
      } else {
        if (before.status === "archived") throw AppError.conflict("Advertisement is already archived.");
        status = "archived";
      }
      const advertisement = await advertisementRepository.setStatus(id, status, adminId, session);
      if (!advertisement) throw AppError.notFound("Advertisement not found.");
      await adminRepository.createAudit({ adminId, action: `advertisement.${action}`, targetType: "advertisement", targetId: id, before: { status: before.status }, after: { status } }, session);
      return withEffectiveStatus(advertisement.toObject());
    });
  },

  async remove(adminId: string, id: string) {
    await withMongoTransaction(async (session) => {
      const before = await advertisementRepository.findAdminById(id, session);
      if (!before) throw AppError.notFound("Advertisement not found.");
      const advertisement = await advertisementRepository.softDelete(id, adminId, session);
      if (!advertisement) throw AppError.notFound("Advertisement not found.");
      await adminRepository.createAudit({ adminId, action: "advertisement.deleted", targetType: "advertisement", targetId: id, before: { title: before.title, status: before.status }, after: { deletedAt: advertisement.deletedAt } }, session);
      return advertisement;
    });
  },

  async listActive(userId: string, placement: "home_list") {
    const user = await UserModel.findById(userId).select("subscriptionTier").lean();
    if (!user) throw AppError.unauthorized();
    return advertisementRepository.listActive(placement, user.subscriptionTier);
  },
};
