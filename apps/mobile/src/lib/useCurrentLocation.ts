import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";

export type CurrentLocationState =
  | { status: "loading" }
  | { status: "granted"; coords: { lng: number; lat: number } }
  | { status: "denied" };

/**
 * Requests foreground location once, and — since tab screens stay mounted across tab
 * switches — re-checks on every focus while still "denied" so granting permission
 * (in-app or via OS settings) and coming back is picked up without a full remount.
 */
export function useCurrentLocation(enabled = true) {
  const [location, setLocation] = useState<CurrentLocationState>({ status: "loading" });

  const requestLocation = useCallback(async () => {
    setLocation({ status: "loading" });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocation({ status: "denied" });
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    setLocation({
      status: "granted",
      coords: { lng: position.coords.longitude, lat: position.coords.latitude },
    });
  }, []);

  const locationStatusRef = useRef(location.status);
  locationStatusRef.current = location.status;
  useFocusEffect(
    useCallback(() => {
      if (enabled && locationStatusRef.current !== "granted") {
        void requestLocation();
      }
    }, [enabled, requestLocation])
  );

  return { location, requestLocation, setLocation };
}
