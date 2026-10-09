import { apiClient } from "@/lib/apiClient";
import type { Coords, PrecisePlaceResult } from "../components/LocationPickerMap";

export async function searchPrecisePlace(
  query: string,
  referenceCoords?: Coords,
  languageCode?: string
): Promise<PrecisePlaceResult | null> {
  try {
    const { data } = await apiClient.post<{ place: PrecisePlaceResult }>("/location/search", {
      query,
      latitude: referenceCoords?.lat,
      longitude: referenceCoords?.lng,
      languageCode,
    }, { timeout: 15_000 });
    return data.place;
  } catch {
    // Older/unconfigured servers still get the native geocoder fallback.
    return null;
  }
}
