import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

interface PlacesTextSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }>;
}

export interface PlaceSearchInput {
  query: string;
  latitude?: number;
  longitude?: number;
  languageCode?: string;
}

export async function searchPlace(input: PlaceSearchInput) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new AppError(503, "INTERNAL_ERROR", "Accurate place search is not configured on this server.");
  }

  const body: Record<string, unknown> = {
    textQuery: input.query,
    maxResultCount: 5,
    languageCode: input.languageCode?.split("-")[0],
  };
  if (input.latitude !== undefined && input.longitude !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: input.latitude, longitude: input.longitude },
        radius: 50_000,
      },
    };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new AppError(502, "INTERNAL_ERROR", "Place search is temporarily unavailable.");
  }

  const data = await response.json() as PlacesTextSearchResponse;
  const place = data.places?.find((candidate) =>
    Number.isFinite(candidate.location?.latitude) && Number.isFinite(candidate.location?.longitude)
  );
  if (!place?.location || place.location.latitude === undefined || place.location.longitude === undefined) {
    throw AppError.notFound("No matching place was found.");
  }

  return {
    placeId: place.id,
    coords: { lat: place.location.latitude, lng: place.location.longitude },
    address: [place.displayName?.text, place.formattedAddress].filter(Boolean).join(", "),
  };
}
