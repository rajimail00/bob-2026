import { z } from "zod";
import { SUPPORTED_LOCALES } from "./auth.model.js";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  locale: z.enum(SUPPORTED_LOCALES).default("en"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().length(6, "Enter the 6-digit code"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const createProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  photoUrl: z.string().url().optional(),
  phone: z.string().trim().max(30).optional(),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const workerProfileSchema = z.object({
  categories: z.array(z.string().min(1)).min(1, "Choose at least one category").max(5, "Choose up to 5 categories"),
  serviceHours: z.enum(["standard", "24h"]).default("standard"),
});
export type WorkerProfileInput = z.infer<typeof workerProfileSchema>;
