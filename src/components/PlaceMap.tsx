import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "../lib/places";

/**
 * Interactive OpenStreetMap map with real coordinates.
 *
 * - markers for the listed venues (navy ፍሬ (Firie) pins via divIcon, so no
 *   bundled marker assets are needed)
 * - click a marker → open that place's details
 * - external navigation is offered on the detail screen
 * - tiles © OpenStreetMap contributors
 */

interface Props {
  places: Place[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  center?: { lat: number; lng: number };
  height?: number;
  /** Refit the viewport when the place list changes. */
  autoFit?: boolean;
  interactive?: boolean;
}

const pinIcon = L.divIcon({
  className: "",
  html: '<div class="fitly-pin"><span></span></div>',
  iconSize: [26, 34],
  iconAnchor: [13, 32],
  popupAnchor: [0, -30],
});

export default function PlaceMap({
  places,
  selectedId,
  onSelect,
  center,
  height = 240,
  autoFit = true,
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const fallback = center ?? { lat: 9.0192, lng: 38.7525 };
    const map = L.map(containerRef.current, {
      center: [fallback.lat, fallback.lng],
      zoom: 12,
      scrollWheelZoom: false,
      dragging: interactive,
      zoomControl: interactive,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [center?.lat, center?.lng, interactive]);

  // Keep markers in sync with the place list.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const place of places) {
      const marker = L.marker([place.lat, place.lng], { icon: pinIcon, title: place.name });
      marker.bindPopup(
        `<div class="fitly-map-popup"><b>${place.name}</b><br/>${place.neighborhood}, ${place.city}</div>`,
        { closeButton: false }
      );
      marker.on("click", () => onSelectRef.current?.(place.id));
      if (place.id === selectedId) marker.openPopup();
      marker.addTo(layer);
    }

    if (autoFit && places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.25), { animate: false, maxZoom: 14 });
    }
    // Recenter when a specific place is selected from outside.
    if (selectedId) {
      const sel = places.find((p) => p.id === selectedId);
      if (sel) map.panTo([sel.lat, sel.lng], { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, selectedId, autoFit]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-[16px] border border-[#e7ebf0]" />;
}
