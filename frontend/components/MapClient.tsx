"use client";

import dynamic from "next/dynamic";
import type { MapApartment } from "./MapComponent";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
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
