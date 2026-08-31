import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

// Set synchronously, before any test file's top-level imports evaluate config/env.ts.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-please-ignore";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-please-ignore";
process.env.CORS_ORIGIN ??= "http://localhost:8081";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/bob_test_placeholder";

let mongod: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(mongod.getUri());
}, 120000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
