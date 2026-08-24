import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().min(1, "auth.errors.emailRequired").email("auth.errors.emailInvalid"),
  password: z.string().min(8, "auth.errors.passwordTooShort"),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  code: z.string().length(6, "auth.errors.codeInvalid"),
});
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "auth.errors.emailRequired").email("auth.errors.emailInvalid"),
  password: z.string().min(1, "auth.errors.passwordRequired"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const createProfileSchema = z.object({
  firstName: z.string().trim().min(1, "auth.errors.firstNameRequired").max(60),
  lastName: z.string().trim().min(1, "auth.errors.lastNameRequired").max(60),
  photoUrl: z.string().url().optional(),
  phone: z.string().trim().max(30).optional(),
});
export type CreateProfileFormValues = z.infer<typeof createProfileSchema>;
