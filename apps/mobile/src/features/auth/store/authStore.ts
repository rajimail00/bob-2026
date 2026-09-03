import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { resolveDeviceLocale, setAppLocale } from "@/lib/i18n";

const ACCESS_TOKEN_KEY = "bob.accessToken";
const REFRESH_TOKEN_KEY = "bob.refreshToken";

interface AuthState {
  isHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  accessToken: null,
  refreshToken: null,
  user: null,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken, refreshToken, isHydrated: true });
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  setUser: (user) => set({ user }),

  signOut: async () => {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
    set({ accessToken: null, refreshToken: null, user: null });
    await setAppLocale(resolveDeviceLocale());
  },
}));
