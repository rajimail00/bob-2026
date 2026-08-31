import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { authController } from "./auth.controller.js";

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
});

export const authRouter = Router();

authRouter.post("/register", authRateLimit, asyncHandler(authController.register));
authRouter.post("/verify-email", authRateLimit, asyncHandler(authController.verifyEmail));
authRouter.post("/resend-code", authRateLimit, asyncHandler(authController.resendCode));
authRouter.post("/login", authRateLimit, asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));
authRouter.delete("/account", requireAuth, asyncHandler(authController.deleteAccount));
authRouter.post("/profile", requireAuth, asyncHandler(authController.completeProfile));
authRouter.post("/worker-profile", requireAuth, asyncHandler(authController.completeWorkerProfile));
authRouter.patch(
  "/notification-preferences",
  requireAuth,
  asyncHandler(authController.updateNotificationPreferences)
);
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
