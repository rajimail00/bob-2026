"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { usePortalI18n } from "@/lib/portal-i18n";

declare global { interface Window { google?: any; __bobGoogleMapsPromise?: Promise<void> } }

interface Coords { lat: number; lng: number }
interface PlaceResult { coords: Coords; address: string }

function loadGoogleMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__bobGoogleMapsPromise) return window.__bobGoogleMapsPromise;
  window.__bobGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  });
  return window.__bobGoogleMapsPromise;
}

export function PostLocationPickerMap({ coordinates, address, onChange }: { coordinates: Coords; address: string; onChange: (next: PlaceResult) => void }) {
  const { t, locale } = usePortalI18n();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const latestCoordinates = useRef(coordinates);
  const latestAddress = useRef(address);
  const [searchText, setSearchText] = useState(address);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  latestCoordinates.current = coordinates;
  latestAddress.current = address;

  useEffect(() => { setSearchText(address); }, [address]);

  useEffect(() => {
    if (!key || !container.current) return;
    let active = true;
    loadGoogleMaps(key).then(() => {
      if (!active || !container.current || !window.google?.maps) return;
      geocoder.current = new window.google.maps.Geocoder();
      map.current = new window.google.maps.Map(container.current, { center: latestCoordinates.current, zoom: 15, mapTypeControl: false, fullscreenControl: false, streetViewControl: false, clickableIcons: false });
      marker.current = new window.google.maps.Marker({ map: map.current, position: latestCoordinates.current, draggable: true });
      marker.current.addListener("dragend", (event: any) => void choosePoint({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
      map.current.addListener("click", (event: any) => void choosePoint({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
    }).catch((value) => setError(value instanceof Error ? value.message : t("locationPicker.serviceUnavailable")));
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    map.current.panTo(coordinates);
    marker.current.setPosition(coordinates);
  }, [coordinates.lat, coordinates.lng]);

  async function choosePoint(coords: Coords) {
    marker.current?.setPosition(coords);
    map.current?.panTo(coords);
    if (!geocoder.current) { onChange({ coords, address: latestAddress.current }); return; }
    try {
      const result = await geocoder.current.geocode({ location: coords, language: locale });
      onChange({ coords, address: result.results?.[0]?.formatted_address || latestAddress.current });
      setError("");
    } catch {
      onChange({ coords, address: latestAddress.current });
      setError(t("locationPicker.reverseFailed"));
    }
  }

  async function search() {
    const query = searchText.trim();
    if (!query) { setError(t("locationPicker.emptySearch")); return; }
    setSearching(true); setError("");
    try {
      let place: PlaceResult | null = null;
      try {
        const response = await apiFetch<{ place: PlaceResult }>("location/search", { method: "POST", body: JSON.stringify({ query, latitude: coordinates.lat, longitude: coordinates.lng, languageCode: locale }) });
        place = response.place;
      } catch {
        if (geocoder.current) {
          const response = await geocoder.current.geocode({ address: query, language: locale, bounds: map.current?.getBounds() });
          const first = response.results?.[0];
          if (first) place = { coords: { lat: first.geometry.location.lat(), lng: first.geometry.location.lng() }, address: first.formatted_address || query };
        }
      }
      if (!place) throw new Error(t("locationPicker.notFound"));
      setSearchText(place.address);
      onChange(place);
    } catch (value) {
      setError(value instanceof Error ? value.message : t("locationPicker.searchFailed"));
    } finally { setSearching(false); }
  }

  return <div className="post-location-picker">
    <div className="post-address-search">
      <input name="address" value={searchText} onChange={(event) => { setSearchText(event.target.value); onChange({ coords: coordinates, address: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder={t("locationPicker.searchPlaceholder")} required />
      <button type="button" className="button button-primary" onClick={() => void search()} disabled={searching}>{searching ? t("common.loading") : t("locationPicker.search")}</button>
    </div>
    {!key ? <div className="post-map post-map-message"><strong>Google Maps needs configuration</strong><small>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to apps/admin/.env.local.</small></div> : <div ref={container} className="post-map" aria-label={t("locationPicker.selected")}/>} 
    <p className="post-map-instruction">{t("locationPicker.instruction")}</p>
    {error ? <p className="field-error" role="alert">{error}</p> : null}
  </div>;
}
