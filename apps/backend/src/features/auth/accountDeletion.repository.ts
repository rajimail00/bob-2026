import { ApplicationModel } from "../applications/application.model.js";
import { JobModel } from "../jobs/job.model.js";
import { MessageModel } from "../messages/message.model.js";
import { ProblemReportModel } from "../problems/problem.model.js";
import { ReviewModel } from "../reviews/review.model.js";

export const accountDeletionRepository = {
  async collectJobLifecycleIds(userId: string) {
    const [ownedJobs, assignedJobs, offeredApplications] = await Promise.all([
      JobModel.find({
        clientId: userId,
        status: { $in: ["draft", "active", "offer_pending", "assigned"] },
      }).select("_id"),
      JobModel.find({ assignedWorkerId: userId, status: "assigned" }).select("_id"),
      ApplicationModel.find({ workerId: userId, status: "offered" }).select("jobId"),
    ]);

    return {
      ownedJobIds: ownedJobs.map((job) => job._id.toString()),
      assignedJobIds: assignedJobs.map((job) => job._id.toString()),
      offeredJobIds: offeredApplications.map((application) => application.jobId.toString()),
    };
  },

  async collectAssetUrls(userId: string): Promise<string[]> {
    const [jobs, applications, messages] = await Promise.all([
      JobModel.find({ clientId: userId }).select("media"),
      ApplicationModel.find({ workerId: userId }).select("voiceNoteUrl"),
      MessageModel.find({ senderId: userId }).select("attachmentUrl"),
    ]);

    const urls: string[] = [];

    for (const job of jobs) {
      for (const media of job.media) {
        if (media.url) {
          urls.push(media.url);
        }
      }
    }

    for (const application of applications) {
      if (application.voiceNoteUrl) {
        urls.push(application.voiceNoteUrl);
      }
    }

    for (const message of messages) {
      if (message.attachmentUrl) {
        urls.push(message.attachmentUrl);
      }
    }

    return [...new Set(urls)];
  },

  async anonymizeRelatedData(userId: string): Promise<void> {
    const ownedJobs = await JobModel.find({
      clientId: userId,
    }).select("_id");

    const ownedJobIds = ownedJobs.map((job) => job._id);

    await Promise.all([
      // Remove personal content from jobs while preserving history.
      JobModel.updateMany(
        { clientId: userId },
        {
          $set: {
            title: "Job by deleted user",
            description: "Content removed",
            media: [],
            address: "Removed",
            location: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        }
      ),

      // Remove the deleted worker's application messages and recordings.
      ApplicationModel.updateMany(
        { workerId: userId },
        {
          $set: { message: "Content removed" },
          $unset: { voiceNoteUrl: "" },
        }
      ),

      // Close unfinished applications from the deleted worker.
      ApplicationModel.updateMany(
        {
          workerId: userId,
          status: { $in: ["pending", "offered", "accepted"] },
        },
        {
          $set: { status: "declined" },
        }
      ),

      // Reject unfinished applications for jobs owned by the deleted user.
      ApplicationModel.updateMany(
        {
          jobId: { $in: ownedJobIds },
          status: { $in: ["pending", "offered"] },
        },
        {
          $set: { status: "rejected" },
        }
      ),

      // Keep conversation history but remove the deleted user's content.
      MessageModel.updateMany(
        { senderId: userId },
        {
          $set: { text: "Message removed" },
          $unset: { attachmentUrl: "" },
        }
      ),

      // Keep ratings the deleted user gave others, but remove comments.
      ReviewModel.updateMany(
        { fromUserId: userId },
        {
          $unset: { comment: "" },
        }
      ),

      // Remove ratings received by the deleted account.
      ReviewModel.deleteMany({
        toUserId: userId,
      }),

      // Keep problem history but remove the deleted user's private note.
      ProblemReportModel.updateMany(
        { reporterId: userId },
        {
          $unset: { note: "" },
        }
      ),
    ]);
  },
};
