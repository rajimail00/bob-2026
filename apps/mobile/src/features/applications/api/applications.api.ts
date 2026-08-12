import { apiClient } from "@/lib/apiClient";
import type { Application, MyApplication } from "../types/application.types";

export const applicationsApi = {
  async apply(jobId: string, input: { message: string; voiceNoteUrl?: string }) {
    const { data } = await apiClient.post<{ application: Application }>(`/jobs/${jobId}/applications`, input);
    return data.application;
  },

  async listForJob(jobId: string) {
    const { data } = await apiClient.get<{ applications: Application[] }>(`/jobs/${jobId}/applications`);
    return data.applications;
  },

  async listMine() {
    const { data } = await apiClient.get<{ applications: MyApplication[] }>("/applications/mine");
    return data.applications;
  },

  async select(applicationId: string) {
    const { data } = await apiClient.patch<{ application: Application }>(`/applications/${applicationId}/select`);
    return data.application;
  },
};
