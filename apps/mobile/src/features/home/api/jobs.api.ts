import { apiClient } from "@/lib/apiClient";
import type { Category, Job, JobDetail, JobListResponse } from "../types/job.types";

export interface JobListParams {
  categoryId?: string;
  search?: string;
  page?: number;
  lng?: number;
  lat?: number;
  radiusKm?: number;
  minBudget?: number;
  maxBudget?: number;
  peopleNeeded?: number;
}

export interface CreateJobInput {
  categoryId: string;
  title: string;
  description: string;
  media: { url: string; type: "photo" | "video" }[];
  location: { lng: number; lat: number };
  address: string;
  date: string;
  peopleNeeded: number;
  budget: number;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  isEmergency: boolean;
  paymentPreference: "cash" | "paypal" | "both";
}

export const jobsApi = {
  async list(params: JobListParams) {
    const { data } = await apiClient.get<JobListResponse>("/jobs", { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<{ job: JobDetail }>(`/jobs/${id}`);
    return data.job;
  },

  async create(input: CreateJobInput) {
    const { data } = await apiClient.post<{ job: JobDetail }>("/jobs", input);
    return data.job;
  },

  async complete(id: string) {
    const { data } = await apiClient.post<{ job: JobDetail }>(`/jobs/${id}/complete`);
    return data.job;
  },

  async remove(id: string) {
    await apiClient.delete(`/jobs/${id}`);
  },

  async cancel(id: string) {
    const { data } = await apiClient.post<{ job: JobDetail }>(`/jobs/${id}/cancel`);
    return data.job;
  },

  async reportProblem(id: string, input: { reason: "cancel" | "address_not_found" | "no_show" | "other"; note?: string }) {
    await apiClient.post(`/jobs/${id}/problems`, input);
  },

  async listMinePosted() {
    const { data } = await apiClient.get<{ jobs: Job[] }>("/jobs/mine/posted");
    return data.jobs;
  },

  async listMineAssigned() {
    const { data } = await apiClient.get<{ jobs: Job[] }>("/jobs/mine/assigned");
    return data.jobs;
  },

  async listCategories() {
    const { data } = await apiClient.get<{ categories: Category[] }>("/categories");
    return data.categories;
  },
};
