export type AdvertisementPlacement = "home_list";
export type AdvertisementAudience = "all" | "free";
export type AdvertisementStatus = "draft" | "active" | "paused" | "archived";
export type AdvertisementEffectiveStatus = AdvertisementStatus | "scheduled" | "expired";
export type AdvertisementMedia = { type: "image" | "video"; url: string; publicId?: string; mimeType?: string };

export interface Advertisement {
  _id: string;
  title: string;
  description?: string;
  media?: AdvertisementMedia;
  destinationUrl?: string;
  placement: AdvertisementPlacement;
  audience: AdvertisementAudience;
  status: AdvertisementStatus;
  effectiveStatus?: AdvertisementEffectiveStatus;
  startsAt?: string;
  endsAt?: string;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvertisementInput {
  title: string;
  description?: string;
  media?: AdvertisementMedia | null;
  destinationUrl?: string | null;
  placement: AdvertisementPlacement;
  audience: AdvertisementAudience;
  startsAt: string;
  endsAt: string;
  priority: number;
  status?: "draft" | "active";
}

export interface CreateAdvertisementInput extends AdvertisementInput {
  status: "draft" | "active";
}

export interface AdvertisementQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdvertisementEffectiveStatus;
}
