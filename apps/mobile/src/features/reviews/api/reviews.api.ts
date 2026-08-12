import { apiClient } from "@/lib/apiClient";

export interface Review {
  _id: string;
  jobId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  comment?: string;
  createdAt: string;
}

export const reviewsApi = {
  async create(jobId: string, input: { stars: number; comment?: string }) {
    const { data } = await apiClient.post<{ review: Review }>(`/jobs/${jobId}/reviews`, input);
    return data.review;
  },
};
