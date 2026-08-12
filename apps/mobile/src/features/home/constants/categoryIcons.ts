import type { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Keyed by category slug (stable) rather than the backend's free-text `icon` field. */
export const CATEGORY_ICON_BY_SLUG: Record<string, IoniconName> = {
  "elderly-care": "heart-outline",
  gastronomy: "restaurant-outline",
  pets: "paw-outline",
  beauty: "sparkles-outline",
  assistance: "bag-outline",
  education: "school-outline",
  transport: "car-outline",
  entertainment: "headset-outline",
  cleaning: "brush-outline",
  security: "shield-checkmark-outline",
  repair: "construct-outline",
  it: "desktop-outline",
  gardening: "leaf-outline",
  childcare: "happy-outline",
  handyman: "hammer-outline",
};

export function getCategoryIcon(slug: string): IoniconName {
  return CATEGORY_ICON_BY_SLUG[slug] ?? "ellipse-outline";
}
