import { apiClient } from "@/lib/apiClient";
import type { AuthUser, Locale, TokenPair } from "../types/auth.types";

export const authApi = {
  async register(input: { email: string; password: string; locale: Locale }) {
    const { data } = await apiClient.post<{ userId: string; email: string }>("/auth/register", input);
    return data;
  },

  async verifyEmail(input: { email: string; code: string }) {
    const { data } = await apiClient.post<{ user: AuthUser } & TokenPair>("/auth/verify-email", input);
    return data;
  },

  async resendCode(email: string) {
    await apiClient.post("/auth/resend-code", { email });
  },

  async login(input: { email: string; password: string }) {
    const { data } = await apiClient.post<{ user: AuthUser } & TokenPair>("/auth/login", input);
    return data;
  },

  async logout() {
    await apiClient.post("/auth/logout");
  },

  async completeProfile(input: { firstName: string; lastName: string }) {
    const { data } = await apiClient.post<{ user: AuthUser }>("/auth/profile", input);
    return data.user;
  },

  async completeWorkerProfile(input: { categories: string[]; serviceHours: "standard" | "24h" }) {
    const { data } = await apiClient.post<{ user: AuthUser }>("/auth/worker-profile", input);
    return data.user;
  },

  async me() {
    const { data } = await apiClient.get<{ user: AuthUser }>("/auth/me");
    return data.user;
  },
};
