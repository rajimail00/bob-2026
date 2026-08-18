import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disconnectSocket } from "@/lib/socket";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import type { Locale } from "../types/auth.types";

export function useRegister() {
  return useMutation({
    mutationFn: (input: { email: string; password: string; locale: Locale }) => authApi.register(input),
  });
}

export function useResendCode() {
  return useMutation({ mutationFn: (email: string) => authApi.resendCode(email) });
}

export function useVerifyEmail() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; code: string }) => authApi.verifyEmail(input),
    onSuccess: async (data) => {
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; password: string }) => authApi.login(input),
    onSuccess: async (data) => {
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      disconnectSocket();
      await signOut();
      queryClient.clear();
    },
  });
}
export function useDeleteAccount() {
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: async () => {
      disconnectSocket();
      await signOut();
      queryClient.clear();
    },
  });
}

export function useCompleteProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { firstName: string; lastName: string }) => authApi.completeProfile(input),
    onSuccess: async (user) => {
      setUser(user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useCompleteWorkerProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { categories: string[]; serviceHours: "standard" | "24h" }) =>
      authApi.completeWorkerProfile(input),
    onSuccess: async (user) => {
      setUser(user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
