import type { ImageURISource } from "react-native";

type NativeMarkerImageSource = number | ImageURISource;

interface CategoryMarkerImageSet {
  default: NativeMarkerImageSource;
  selected: NativeMarkerImageSource;
}

const FALLBACK_MARKERS: CategoryMarkerImageSet = {
  default: require("../../../../assets/map-markers/fallback-default.png"),
  selected: require("../../../../assets/map-markers/fallback-selected.png"),
};

/**
 * Native marker bitmaps use the same Ionicons as the category UI. Android
 * renders these images directly instead of clipping a custom React view while
 * taking the map-marker snapshot.
 */
const CATEGORY_MARKERS: Record<string, CategoryMarkerImageSet> = {
  "elderly-care": {
    default: require("../../../../assets/map-markers/elderly-care-default.png"),
    selected: require("../../../../assets/map-markers/elderly-care-selected.png"),
  },
  gastronomy: {
    default: require("../../../../assets/map-markers/gastronomy-default.png"),
    selected: require("../../../../assets/map-markers/gastronomy-selected.png"),
  },
  pets: {
    default: require("../../../../assets/map-markers/pets-default.png"),
    selected: require("../../../../assets/map-markers/pets-selected.png"),
  },
  beauty: {
    default: require("../../../../assets/map-markers/beauty-default.png"),
    selected: require("../../../../assets/map-markers/beauty-selected.png"),
  },
  assistance: {
    default: require("../../../../assets/map-markers/assistance-default.png"),
    selected: require("../../../../assets/map-markers/assistance-selected.png"),
  },
  education: {
    default: require("../../../../assets/map-markers/education-default.png"),
    selected: require("../../../../assets/map-markers/education-selected.png"),
  },
  transport: {
    default: require("../../../../assets/map-markers/transport-default.png"),
    selected: require("../../../../assets/map-markers/transport-selected.png"),
  },
  entertainment: {
    default: require("../../../../assets/map-markers/entertainment-default.png"),
    selected: require("../../../../assets/map-markers/entertainment-selected.png"),
  },
  cleaning: {
    default: require("../../../../assets/map-markers/cleaning-default.png"),
    selected: require("../../../../assets/map-markers/cleaning-selected.png"),
  },
  security: {
    default: require("../../../../assets/map-markers/security-default.png"),
    selected: require("../../../../assets/map-markers/security-selected.png"),
  },
  repair: {
    default: require("../../../../assets/map-markers/repair-default.png"),
    selected: require("../../../../assets/map-markers/repair-selected.png"),
  },
  it: {
    default: require("../../../../assets/map-markers/it-default.png"),
    selected: require("../../../../assets/map-markers/it-selected.png"),
  },
  gardening: {
    default: require("../../../../assets/map-markers/gardening-default.png"),
    selected: require("../../../../assets/map-markers/gardening-selected.png"),
  },
  childcare: {
    default: require("../../../../assets/map-markers/childcare-default.png"),
    selected: require("../../../../assets/map-markers/childcare-selected.png"),
  },
  handyman: {
    default: require("../../../../assets/map-markers/handyman-default.png"),
    selected: require("../../../../assets/map-markers/handyman-selected.png"),
  },
};

export function getCategoryMarkerImage(slug: string, isSelected: boolean): NativeMarkerImageSource {
  const markerSet = CATEGORY_MARKERS[slug] ?? FALLBACK_MARKERS;
  return isSelected ? markerSet.selected : markerSet.default;
}
