import * as Location from "expo-location";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import { YStack } from "tamagui";
import { Text } from "@/components/ui/Text";

interface Coords {
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  coords: Coords;
  address: string;
  onLocationChange: (next: { coords: Coords; address: string }) => void;
}

function formatAddress(result: Location.LocationGeocodedAddress, selectedLabel: string): string {
  const parts = [
    [result.street, result.streetNumber].filter(Boolean).join(" "),
    result.city,
    result.postalCode,
  ].filter(Boolean);
  return parts.join(", ") || selectedLabel;
}

/** Tap anywhere on the map to drop the pin there — address is filled in automatically via reverse geocoding. */
export function LocationPickerMap({ coords, address, onLocationChange }: LocationPickerMapProps) {
  const { t } = useTranslation();
  const [isResolving, setIsResolving] = useState(false);

  const region: Region = {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const handlePick = async (lat: number, lng: number) => {
    onLocationChange({ coords: { lat, lng }, address });
    setIsResolving(true);
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result) {
        onLocationChange({ coords: { lat, lng }, address: formatAddress(result, t("locationPicker.selected")) });
      }
    } catch {
      // Keep the pin placement even if reverse geocoding fails — address stays as-is/editable.
    } finally {
      setIsResolving(false);
    }
  };

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    void handlePick(latitude, longitude);
  };

  return (
    <YStack gap="$2">
      <YStack height={200} borderRadius="$md" overflow="hidden" borderWidth={1.5} borderColor="$borderColor">
        <MapView style={{ flex: 1 }} region={region} onPress={onMapPress}>
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              void handlePick(latitude, longitude);
            }}
          />
        </MapView>
      </YStack>
      <Text variant="caption" muted>
        {isResolving ? t("locationPicker.finding") : address || t("locationPicker.instruction")}
      </Text>
    </YStack>
  );
}
