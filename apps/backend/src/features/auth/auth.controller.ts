import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { authService } from "./auth.service.js";
import {
  createProfileSchema,
  localePreferenceSchema,
  loginSchema,
  notificationPreferencesSchema,
  refreshSchema,
  registerSchema,
  verifyEmailSchema,
  workerProfileSchema,
} from "./auth.validation.js";

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  },

  async verifyEmail(req: Request, res: Response) {
    const input = verifyEmailSchema.parse(req.body);
    const result = await authService.verifyEmail(input);
    res.status(200).json(result);
  },

  async resendCode(req: Request, res: Response) {
    const { email } = verifyEmailSchema.pick({ email: true }).parse(req.body);
    await authService.resendVerificationCode(email);
    res.status(204).send();
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    await authService.logout(req.auth.userId);
    res.status(204).send();
  },
  async deleteAccount(req: Request, res: Response) {
    if (!req.auth) {
      throw AppError.unauthorized();
    }

    await authService.anonymizeAccount(req.auth.userId);
    res.status(204).send();
  },

  async completeProfile(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = createProfileSchema.parse(req.body);
    const user = await authService.completeProfile(req.auth.userId, input);
    res.status(200).json({ user });
  },

  async completeWorkerProfile(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = workerProfileSchema.parse(req.body);
    const user = await authService.completeWorkerProfile(req.auth.userId, input);
    res.status(200).json({ user });
  },

  async updateNotificationPreferences(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = notificationPreferencesSchema.parse(req.body);
    const user = await authService.updateNotificationPreferences(req.auth.userId, input);
    res.status(200).json({ user });
  },

  async updateLocale(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = localePreferenceSchema.parse(req.body);
    const user = await authService.updateLocale(req.auth.userId, input);
    res.status(200).json({ user });
  },

  async me(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const user = await authService.getMe(req.auth.userId);
    res.status(200).json({ user });
  },
};
