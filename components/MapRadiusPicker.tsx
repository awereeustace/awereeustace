"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function ClickHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return null;
}

type Props = {
  center: [number, number];
  radiusMi: number;
  onCenterChange: (lat: number, lng: number) => void;
};

export default function MapRadiusPicker({ center, radiusMi, onCenterChange }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 w-full rounded-2xl bg-slate-100 animate-pulse" />;

  return (
    <MapContainer
      key={`${center[0]},${center[1]}`}
      center={center}
      zoom={14}
      style={{ height: "260px", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={center}
        radius={radiusMi * 1609.34}
        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12, weight: 2 }}
      />
      <ClickHandler onMove={onCenterChange} />
    </MapContainer>
  );
}
