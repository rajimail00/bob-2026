import { ActivityModel } from "./activity.model.js";

/** Privacy-conscious activity: hourly aggregate only; no route, IP or device data is stored. */
export async function recordUserActivity(userId: string, now = new Date()) {
  const bucketStart = new Date(now);
  bucketStart.setUTCMinutes(0, 0, 0);
  const existing = await ActivityModel.findOne({ userId, bucketStart }).select("lastSeenAt").lean();
  const secondsSinceLast = existing
    ? Math.max(0, Math.min(300, Math.floor((now.getTime() - existing.lastSeenAt.getTime()) / 1000)))
    : 0;
  await ActivityModel.updateOne(
    { userId, bucketStart },
    {
      $setOnInsert: { firstSeenAt: now },
      $set: { lastSeenAt: now },
      $inc: { activeSeconds: secondsSinceLast, requestCount: 1 },
    },
    { upsert: true }
  );
}
