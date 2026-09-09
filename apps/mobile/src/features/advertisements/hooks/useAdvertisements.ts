import { useQuery } from "@tanstack/react-query";
import { advertisementsApi } from "../api/advertisements.api";

export const advertisementKeys = {
  all: ["advertisements"] as const,
  active: (placement: "home_list") => ["advertisements", "active", placement] as const,
};

export const useAdvertisements = (enabled = true) => useQuery({
  queryKey: advertisementKeys.active("home_list"),
  queryFn: () => advertisementsApi.active("home_list"),
  enabled,
  staleTime: 60_000,
});
