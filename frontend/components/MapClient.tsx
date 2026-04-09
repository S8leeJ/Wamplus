"use client";

import dynamic from "next/dynamic";
import type { MapApartment } from "./MapComponent";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-primary-300/40">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
        aria-hidden
      />
      <p className="text-sm font-medium text-primary-900">Loading map…</p>
    </div>
  ),
});

export default function MapClient({
  apartments,
  initialFlyTo,
}: {
  apartments: MapApartment[];
  initialFlyTo?: string;
}) {
  return (
    <MapComponent apartments={apartments} initialFlyTo={initialFlyTo} />
  );
}
