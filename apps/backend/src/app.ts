import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./features/auth/auth.routes.js";
import { jobRouter } from "./features/jobs/job.routes.js";
import { categoryRouter } from "./features/categories/category.routes.js";
import { mediaRouter } from "./features/media/media.routes.js";
import { applicationRouter } from "./features/applications/application.routes.js";
import { notificationRouter } from "./features/notifications/notification.routes.js";

export function createApp() {
  const app = express();

  // Behind nginx in production (one hop) — needed for express-rate-limit and req.ip to read
  // X-Forwarded-For correctly instead of throwing/misidentifying every request as the same IP.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "2mb" }));
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/jobs", jobRouter);
  app.use("/api/v1/categories", categoryRouter);
  app.use("/api/v1/media", mediaRouter);
  app.use("/api/v1/applications", applicationRouter);
  app.use("/api/v1/notifications", notificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
