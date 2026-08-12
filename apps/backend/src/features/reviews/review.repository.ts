import { UserModel } from "../auth/auth.model.js";
import { ReviewModel } from "./review.model.js";

export const reviewRepository = {
  create(data: { jobId: string; fromUserId: string; toUserId: string; stars: number; comment?: string }) {
    return ReviewModel.create(data);
  },

  findByJobAndAuthor(jobId: string, fromUserId: string) {
    return ReviewModel.findOne({ jobId, fromUserId });
  },

  async applyToUserRating(userId: string, stars: number) {
    const user = await UserModel.findById(userId).select("rating");
    if (!user) return;

    const currentCount = user.rating?.count ?? 0;
    const currentAverage = user.rating?.average ?? 0;
    const newCount = currentCount + 1;
    const newAverage = (currentAverage * currentCount + stars) / newCount;

    await UserModel.updateOne(
      { _id: userId },
      { $set: { "rating.average": Math.round(newAverage * 10) / 10, "rating.count": newCount } }
    );
  },
};
