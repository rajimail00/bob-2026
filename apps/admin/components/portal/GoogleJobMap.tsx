"use client";

import { useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/portal-types";
import { formatMoney } from "@/lib/portal-types";

declare global { interface Window { google?: any; __bobGoogleMapsPromise?: Promise<void> } }

function loadGoogleMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__bobGoogleMapsPromise) return window.__bobGoogleMapsPromise;
  window.__bobGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.async = true; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  });
  return window.__bobGoogleMapsPromise;
}

export function GoogleJobMap({ jobs, userCoords }: { jobs: Job[]; userCoords: { lat: number; lng: number } | null }) {
  const container = useRef<HTMLDivElement>(null); const [error, setError] = useState("");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key || !container.current) return;
    let active = true;
    loadGoogleMaps(key).then(() => {
      if (!active || !container.current || !window.google?.maps) return;
      const first = jobs[0]?.location.coordinates;
      const center = userCoords ?? (first ? { lng: first[0], lat: first[1] } : { lat: 51.1657, lng: 10.4515 });
      const map = new window.google.maps.Map(container.current, { center, zoom: userCoords || first ? 12 : 6, mapTypeControl: false, fullscreenControl: true, streetViewControl: false });
      const bounds = new window.google.maps.LatLngBounds();
      jobs.forEach((job) => {
        const position = { lng: job.location.coordinates[0], lat: job.location.coordinates[1] }; bounds.extend(position);
        const marker = new window.google.maps.Marker({ map, position, title: job.title });
        const content = document.createElement("div"); content.className = "map-info";
        const title = document.createElement("strong"); title.textContent = job.title;
        const budget = document.createElement("span"); budget.textContent = formatMoney(job.budget);
        const address = document.createElement("p"); address.textContent = job.address;
        const link = document.createElement("a"); link.href = `/portal/jobs/${encodeURIComponent(job._id)}`; link.textContent = "View details";
        content.append(title, budget, address, link);
        const info = new window.google.maps.InfoWindow({ content });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
      });
      if (!userCoords && jobs.length > 1) map.fitBounds(bounds, 55);
      if (userCoords) new window.google.maps.Marker({ map, position: userCoords, title: "Your location", icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
    }).catch((value) => setError(value instanceof Error ? value.message : "Google Maps could not be loaded."));
    return () => { active = false; };
  }, [jobs, key, userCoords]);
  if (!key) return <div className="map-setup-state"><strong>Google Maps needs configuration</strong><p>Add a browser-restricted <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>apps/admin/.env.local</code>, then restart the website.</p></div>;
  if (error) return <div className="map-setup-state error"><strong>Map unavailable</strong><p>{error}</p></div>;
  return <div ref={container} className="google-job-map" aria-label="Map of available jobs"/>;
}
