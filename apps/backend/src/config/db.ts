import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err);
  });

  await mongoose.connect(uri);
  console.log(`[mongo] connected -> ${mongoose.connection.name}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
