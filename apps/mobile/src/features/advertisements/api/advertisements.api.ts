import { apiClient } from "@/lib/apiClient";
import type { Advertisement, AdvertisementPlacement } from "../types/advertisement.types";

export const advertisementsApi = {
  async active(placement: AdvertisementPlacement = "home_list") {
    const response = await apiClient.get<{ advertisements: Advertisement[] }>("/advertisements/active", { params: { placement } });
    return response.data.advertisements;
  },
};
