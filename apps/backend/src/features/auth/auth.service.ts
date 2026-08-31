import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AppError } from "../../lib/errors.js";
import { deleteCloudinaryAssetByUrl } from "../../lib/cloudinary.js";
import { sendVerificationEmail } from "../../lib/mailer.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { jobService } from "../jobs/job.service.js";
import { authRepository } from "./auth.repository.js";
import { accountDeletionRepository } from "./accountDeletion.repository.js";
import type {
  CreateProfileInput,
  LoginInput,
  NotificationPreferencesInput,
  RegisterInput,
  VerifyEmailInput,
  WorkerProfileInput,
} from "./auth.validation.js";
import {
  normalizeNotificationPreferences,
  type UserDocument,
} from "./auth.model.js";

const SALT_ROUNDS = 12;
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function issueTokenPair(user: UserDocument) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.refreshTokenVersion ?? 0 });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await authRepository.create({
      email: input.email,
      passwordHash,
      locale: input.locale,
    });

    const code = generateVerificationCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    await authRepository.save(user);

    await sendVerificationEmail(user.email, code, user.locale);

    return { userId: user.id, email: user.email };
  },

  async verifyEmail(input: VerifyEmailInput) {
    const user = await authRepository.findByEmail(input.email, true);
    if (!user) throw AppError.notFound("No account found for this email.");
    if (user.isEmailVerified) throw AppError.conflict("This email is already verified.");

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      throw AppError.badRequest("No verification code was requested for this account.");
    }
    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw AppError.badRequest("This code has expired. Request a new one.");
    }

    const isMatch = await bcrypt.compare(input.code, user.emailVerificationCodeHash);
    if (!isMatch) throw AppError.badRequest("Incorrect code. Please try again.");

    user.isEmailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await authRepository.save(user);

    const tokens = issueTokenPair(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async resendVerificationCode(email: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw AppError.notFound("No account found for this email.");
    if (user.isEmailVerified) throw AppError.conflict("This email is already verified.");

    const code = generateVerificationCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    await authRepository.save(user);
    await sendVerificationEmail(user.email, code, user.locale);
  },

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email, true);
    if (!user) throw AppError.unauthorized("Incorrect email or password.");

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) throw AppError.unauthorized("Incorrect email or password.");

    if (user.status === "banned") {
      throw AppError.forbidden("This account has been suspended. Contact support for help.");
    }
    if (user.status === "deleted") {
      throw AppError.unauthorized("This account no longer exists.");
    }
    if (!user.isEmailVerified) {
      throw AppError.forbidden("Please verify your email before logging in.");
    }

    const tokens = issueTokenPair(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Session expired. Please log in again.");
    }

    const user = await authRepository.findById(payload.sub);

    if (!user || user.status !== "active") {
      throw AppError.unauthorized("Session expired. Please log in again.");
    }
    if ((user.refreshTokenVersion ?? 0) !== payload.tokenVersion) {
      throw AppError.unauthorized("Session expired. Please log in again.");
    }

    return issueTokenPair(user);
  },

  async logout(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) return;
    user.refreshTokenVersion = (user.refreshTokenVersion ?? 0) + 1;
    await authRepository.save(user);
  },

  async anonymizeAccount(userId: string) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw AppError.notFound("Account not found.");
    }

    if (user.status !== "active") {
      throw AppError.forbidden("Only an active account can be deleted.");
    }

  // Collect every currently referenced file owned by this account.
    const relatedAssetUrls =
      await accountDeletionRepository.collectAssetUrls(userId);

    const assetUrls = [
      user.photoUrl,
      ...relatedAssetUrls,
    ].filter(
      (url): url is string =>
        typeof url === "string" && url.length > 0
    );

    // Delete profile photos, job media, voice notes and attachments.
    for (const assetUrl of new Set(assetUrls)) {
      await deleteCloudinaryAssetByUrl(assetUrl);
    }

    const { ownedJobIds, assignedJobIds, offeredJobIds } =
      await accountDeletionRepository.collectJobLifecycleIds(userId);

    // Route every job status change through the central state machine.
    await Promise.all([
      ...ownedJobIds.map((jobId) => jobService.transitionStatus(jobId, "cancelled")),
      ...assignedJobIds.map((jobId) => jobService.transitionStatus(jobId, "cancelled")),
      ...offeredJobIds.map((jobId) => jobService.transitionStatus(jobId, "active")),
    ]);

    // Preserve shared history while removing personal content.
    await accountDeletionRepository.anonymizeRelatedData(userId);

    // Replace the original password with an unusable random password.
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const anonymousPasswordHash = await bcrypt.hash(
      randomPassword,
      SALT_ROUNDS
    );

    // Release the original email so it can be registered again.
    user.email = `deleted+${user.id}@deleted.invalid`;
    user.passwordHash = anonymousPasswordHash;

    // Keep only an anonymous identity for shared historical records.
    user.firstName = "Deleted";
    user.lastName = "user";

    // Remove personal/profile information.
    user.photoUrl = undefined;
    user.phone = undefined;
    user.bio = undefined;
    user.workerProfile = undefined;

    user.rating = {
      average: 0,
      count: 0,
    };

    user.notificationPrefs = {
      newApplicant: false,
      newMessage: false,
      offers: false,
      applicationUpdates: false,
      jobStatusChanges: false,
      jobEdits: false,
      cancellations: false,
      completions: false,
      jobWon: false,
    };

    user.subscriptionTier = "free";
    user.locale = "en";
    user.isEmailVerified = false;

    // Remove verification secrets and invalidate refresh tokens.
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.refreshTokenVersion = (user.refreshTokenVersion ?? 0) + 1;

    user.status = "deleted";
    user.deletedAt = new Date();

    await authRepository.save(user);
  },

  async completeProfile(userId: string, input: CreateProfileInput) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound();

    user.firstName = input.firstName;
    user.lastName = input.lastName;
    if (input.photoUrl) user.photoUrl = input.photoUrl;
    if (input.phone) user.phone = input.phone;

    await authRepository.save(user);
    return toPublicUser(user);
  },

  async completeWorkerProfile(userId: string, input: WorkerProfileInput) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound();

    user.workerProfile = {
      categories: input.categories,
      serviceHours: input.serviceHours,
      completedJobsCount: user.workerProfile?.completedJobsCount ?? 0,
    };

    await authRepository.save(user);
    return toPublicUser(user);
  },

  async updateNotificationPreferences(userId: string, input: NotificationPreferencesInput) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound();

    user.notificationPrefs = {
      ...normalizeNotificationPreferences(user.notificationPrefs),
      ...input,
    };
    await authRepository.save(user);
    return toPublicUser(user);
  },

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound();
    return toPublicUser(user);
  },
};

export function toPublicUser(user: UserDocument) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    locale: user.locale,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    phone: user.phone,
    bio: user.bio,
    rating: user.rating,
    workerProfile: user.workerProfile,
    notificationPrefs: normalizeNotificationPreferences(user.notificationPrefs),
    subscriptionTier: user.subscriptionTier,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}
