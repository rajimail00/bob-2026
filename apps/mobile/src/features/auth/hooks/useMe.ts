import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { setAppLocale } from "@/lib/i18n";

/** Server-owned session user. Enabled only once tokens exist so guests never fire a doomed request. */
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      await setAppLocale(user.locale);
      return user;
    },
    enabled: Boolean(accessToken),
    staleTime: 60_000,
    retry: false,
  });
}
