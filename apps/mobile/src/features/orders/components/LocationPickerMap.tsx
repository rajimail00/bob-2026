import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { useTranslation } from "react-i18next";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";

export interface Coords {
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  coords: Coords;
  address: string;
  onLocationChange: (next: { coords: Coords; address: string }) => void;
  onSearchFocus?: () => void;
}

export type AddressSearchErrorCode =
  | "empty"
  | "notFound"
  | "searchFailed"
  | "serviceUnavailable";

export class AddressSearchError extends Error {
  readonly code: AddressSearchErrorCode;

  constructor(code: AddressSearchErrorCode) {
    super(code);
    this.name = "AddressSearchError";
    this.code = code;
  }
}

const COUNTRY_NAMES = new Set([
  "austria",
  "deutschland",
  "france",
  "germany",
  "india",
  "italia",
  "italy",
  "nederland",
  "netherlands",
  "österreich",
  "schweiz",
  "spain",
  "suisse",
  "switzerland",
  "united kingdom",
  "united states",
  "usa",
  "españa",
]);

export function buildGeocodeQuery(address: string) {
  const trimmed = address.trim();
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const finalPart = parts.at(-1)?.toLowerCase() ?? "";
  const hasCountry = parts.length >= 3 || COUNTRY_NAMES.has(finalPart);
  return hasCountry ? trimmed : `${trimmed}, Germany`;
}

export function formatAddress(
  result: Location.LocationGeocodedAddress,
  selectedLabel: string
): string {
  const streetLine = result.street
    ? [result.street, result.streetNumber].filter(Boolean).join(" ")
    : result.name ?? "";
  const city = result.city ?? result.district ?? result.subregion ?? result.region;
  const localityLine = [result.postalCode, city].filter(Boolean).join(" ");
  const parts = [streetLine, localityLine, result.country].filter(Boolean);
  if (streetLine || localityLine) return [...new Set(parts)].join(", ");
  return result.formattedAddress || selectedLabel;
}

function isServiceUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return ["network", "unavailable", "timed out", "timeout", "service"].some((term) =>
    message.includes(term)
  );
}

export async function resolveAddressSearch(
  address: string,
  selectedLabel: string,
  geocode: typeof Location.geocodeAsync = Location.geocodeAsync,
  reverseGeocode: typeof Location.reverseGeocodeAsync = Location.reverseGeocodeAsync
) {
  const trimmed = address.trim();
  if (!trimmed) throw new AddressSearchError("empty");

  let results: Location.LocationGeocodedLocation[];
  try {
    results = await geocode(buildGeocodeQuery(trimmed));
  } catch (error) {
    throw new AddressSearchError(
      isServiceUnavailableError(error) ? "serviceUnavailable" : "searchFailed"
    );
  }

  const bestResult = results.find(
    (result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude)
  );
  if (!bestResult) throw new AddressSearchError("notFound");

  const coords = { lat: bestResult.latitude, lng: bestResult.longitude };
  let cleanAddress = trimmed;
  let reverseGeocodeFailed = false;

  try {
    const [reverseResult] = await reverseGeocode({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    if (reverseResult) cleanAddress = formatAddress(reverseResult, selectedLabel);
    else reverseGeocodeFailed = true;
  } catch {
    reverseGeocodeFailed = true;
  }

  return { coords, address: cleanAddress, reverseGeocodeFailed };
}

/** Address search plus a draggable/tappable map, synchronized with the parent job form. */
export function LocationPickerMap({
  coords,
  address,
  onLocationChange,
  onSearchFocus,
}: LocationPickerMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const searchRevision = useRef(0);
  const [searchText, setSearchText] = useState(address);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const region: Region = {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    setSearchText(address);
  }, [address]);

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 350);
  }, [coords.lat, coords.lng]);

  useEffect(
    () => () => {
      searchRevision.current += 1;
    },
    []
  );

  const requestGeocodingPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") return true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status === "granted";
  };

  const searchAddress = async () => {
    if (!searchText.trim()) {
      setErrorKey("locationPicker.emptySearch");
      return;
    }

    const revision = searchRevision.current + 1;
    searchRevision.current = revision;
    setErrorKey(null);
    setIsSearching(true);

    try {
      if (!(await requestGeocodingPermission())) {
        if (searchRevision.current === revision) {
          setErrorKey("locationPicker.permissionDenied");
        }
        return;
      }

      const result = await resolveAddressSearch(searchText, t("locationPicker.selected"));
      if (searchRevision.current !== revision) return;

      setSearchText(result.address);
      onLocationChange(result);
      setErrorKey(result.reverseGeocodeFailed ? "locationPicker.reverseFailed" : null);
      Keyboard.dismiss();
    } catch (error) {
      if (searchRevision.current !== revision) return;
      const code = error instanceof AddressSearchError ? error.code : "searchFailed";
      setErrorKey(`locationPicker.${code}`);
    } finally {
      if (searchRevision.current === revision) setIsSearching(false);
    }
  };

  const handlePick = async (lat: number, lng: number) => {
    const nextCoords = { lat, lng };
    searchRevision.current += 1;
    setErrorKey(null);
    setIsResolving(true);
    // Move the marker immediately. If reverse geocoding fails, the previous valid address stays.
    onLocationChange({ coords: nextCoords, address });

    try {
      if (!(await requestGeocodingPermission())) {
        setErrorKey("locationPicker.permissionDenied");
        return;
      }

      const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!result) {
        setErrorKey("locationPicker.reverseFailed");
        return;
      }

      const nextAddress = formatAddress(result, t("locationPicker.selected"));
      setSearchText(nextAddress);
      onLocationChange({ coords: nextCoords, address: nextAddress });
    } catch {
      setErrorKey("locationPicker.reverseFailed");
    } finally {
      setIsResolving(false);
    }
  };

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void handlePick(latitude, longitude);
  };

  const clearSearch = () => {
    searchRevision.current += 1;
    setSearchText("");
    setErrorKey(null);
    setIsSearching(false);
  };

  return (
    <YStack gap="$2">
      <XStack gap="$2" alignItems="center">
        <YStack flex={1}>
          <Input
            value={searchText}
            onChangeText={(value) => {
              setSearchText(value);
              setErrorKey(null);
            }}
            onFocus={onSearchFocus}
            onSubmitEditing={() => void searchAddress()}
            returnKeyType="search"
            accessibilityLabel={t("locationPicker.searchLabel")}
            placeholder={t("locationPicker.searchPlaceholder")}
            editable={!isSearching}
            rightElement={searchText ? (
              <XStack
                padding="$2"
                onPress={clearSearch}
                role="button"
                aria-label={t("locationPicker.clear")}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </XStack>
            ) : undefined}
          />
        </YStack>
        <Button
          size="sm"
          onPress={() => void searchAddress()}
          loading={isSearching}
          disabled={isSearching}
          aria-label={t("locationPicker.search")}
        >
          {t("locationPicker.search")}
        </Button>
      </XStack>

      <YStack height={200} borderRadius="$md" overflow="hidden" borderWidth={1.5} borderColor="$borderColor">
        <MapView ref={mapRef} style={{ flex: 1 }} region={region} onPress={onMapPress}>
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            draggable
            onDragEnd={(event) => {
              const { latitude, longitude } = event.nativeEvent.coordinate;
              void handlePick(latitude, longitude);
            }}
          />
        </MapView>
      </YStack>

      <Text variant="caption" muted>
        {isResolving ? t("locationPicker.finding") : address || t("locationPicker.instruction")}
      </Text>
      {errorKey ? (
        <Text variant="small" color="$danger">
          {t(errorKey)}
        </Text>
      ) : null}
    </YStack>
  );
}
