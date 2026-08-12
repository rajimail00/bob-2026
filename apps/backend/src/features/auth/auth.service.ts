import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AppError } from "../../lib/errors.js";
import { sendVerificationEmail } from "../../lib/mailer.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { authRepository } from "./auth.repository.js";
import type {
  CreateProfileInput,
  LoginInput,
  RegisterInput,
  VerifyEmailInput,
  WorkerProfileInput,
} from "./auth.validation.js";
import type { UserDocument } from "./auth.model.js";

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
    if (!user) throw AppError.unauthorized();
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
    notificationPrefs: user.notificationPrefs,
    subscriptionTier: user.subscriptionTier,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}
