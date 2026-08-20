import { Types } from "mongoose";
import { MessageModel } from "./message.model.js";

export const messageRepository = {
  create(data: { jobId: string; workerId: string; senderId: string; text?: string; attachmentUrl?: string }) {
    return MessageModel.create(data);
  },

  listForConversation(jobId: string, workerId: string) {
    return MessageModel.find({ jobId, workerId })
      .sort({ createdAt: 1 })
      .populate("senderId", "firstName lastName photoUrl");
  },

  markReadForConversation(jobId: string, workerId: string, viewerId: string) {
    return MessageModel.updateMany(
      { jobId, workerId, senderId: { $ne: viewerId }, readAt: null },
      { $set: { readAt: new Date() } }
    );
  },

  /** Per-job unread count for a worker across all of their jobs — messages from the client
   * they haven't opened yet. Used to badge the "My Jobs" list. */
  async countUnreadForWorkerJobs(jobIds: string[], workerId: string): Promise<Record<string, number>> {
    if (jobIds.length === 0) return {};
    const rows = await MessageModel.aggregate([
      {
        $match: {
          jobId: { $in: jobIds.map((id) => new Types.ObjectId(id)) },
          workerId: new Types.ObjectId(workerId),
          senderId: { $ne: new Types.ObjectId(workerId) },
        },
      },
      { $match: { $expr: { $eq: [{ $ifNull: ["$readAt", null] }, null] } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    // `_id` is null for any stray message missing a jobId (shouldn't happen since it's required
    // and immutable, but this endpoint crashed in the past on legacy pre-migration rows —
    // guard against it rather than 500 the whole "My Jobs" list over a handful of bad rows).
    return Object.fromEntries(
      rows.filter((row) => row._id != null).map((row) => [row._id.toString(), row.count as number])
    );
  },

  /** Per-applicant conversation summary for a job's owner — last message and unread count
   * for each candidate they've exchanged messages with. */
  async listConversationSummariesForJob(jobId: string, clientId: string) {
    const rows = await MessageModel.aggregate([
      // Excludes messages from before conversations were scoped per-applicant, which have no
      // workerId — grouping those under `_id: null` used to crash this endpoint.
      { $match: { jobId: new Types.ObjectId(jobId), workerId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$workerId",
          lastMessageText: { $first: "$text" },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$senderId", new Types.ObjectId(clientId)] },
                    { $eq: [{ $ifNull: ["$readAt", null] }, null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    return new Map(
      rows.map((row) => [
        row._id.toString(),
        { lastMessageText: row.lastMessageText as string | undefined, lastMessageAt: row.lastMessageAt as Date, unreadCount: row.unreadCount as number },
      ])
    );
  },
};
