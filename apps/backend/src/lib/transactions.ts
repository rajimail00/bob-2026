import mongoose, { type ClientSession } from "mongoose";

export async function withMongoTransaction<T>(
  work: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(() => work(session));
    if (result === undefined) {
      throw new Error("MongoDB transaction completed without a result.");
    }
    return result;
  } finally {
    await session.endSession();
  }
}

export function isMongoTransactionConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const code = "code" in error ? error.code : undefined;
  if (code === 112 || code === 251) return true;

  const hasErrorLabel =
    "hasErrorLabel" in error && typeof error.hasErrorLabel === "function"
      ? error.hasErrorLabel.bind(error)
      : undefined;

  return Boolean(
    hasErrorLabel?.("TransientTransactionError")
  );
}
