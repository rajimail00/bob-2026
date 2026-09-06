import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { UserModel } from "../features/auth/auth.model.js";
import mongoose from "mongoose";

const DEVELOPMENT_EMAIL = "adminbob123@gmail.com";
const DEVELOPMENT_PASSWORD = "admin@123";

async function seedAdmin() {
  const email = (env.ADMIN_EMAIL ?? (env.NODE_ENV === "production" ? "" : DEVELOPMENT_EMAIL))
    .trim()
    .toLowerCase();
  const password = env.ADMIN_PASSWORD ?? (env.NODE_ENV === "production" ? "" : DEVELOPMENT_PASSWORD);

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in production.");
  }
  if (env.NODE_ENV === "production" && password.length < 16) {
    throw new Error("ADMIN_PASSWORD must contain at least 16 characters in production.");
  }

  await connectDatabase();
  const existing = await UserModel.findOne({ email }).select("+passwordHash");
  if (existing && existing.role !== "admin") {
    throw new Error(`Refusing to promote existing non-admin account ${email}.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.status = "active";
    existing.isEmailVerified = true;
    existing.refreshTokenVersion = (existing.refreshTokenVersion ?? 0) + 1;
    await existing.save();
    console.log(`[seed-admin] refreshed existing administrator ${email}`);
    return;
  }

  await UserModel.create({
    email,
    passwordHash,
    role: "admin",
    status: "active",
    isEmailVerified: true,
    locale: "en",
    firstName: "BOB",
    lastName: "Administrator",
  });
  console.log(`[seed-admin] created administrator ${email}`);
}

seedAdmin()
  .catch((error: unknown) => {
    console.error("[seed-admin] failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
