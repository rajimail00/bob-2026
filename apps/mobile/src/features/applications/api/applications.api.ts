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

  async offer(applicationId: string) {
    const { data } = await apiClient.patch<{ application: Application }>(`/applications/${applicationId}/offer`);
    return data.application;
  },

  async respond(applicationId: string, accept: boolean) {
    const { data } = await apiClient.patch<{ application: MyApplication }>(`/applications/${applicationId}/respond`, {
      accept,
    });
    return data.application;
  },
};
