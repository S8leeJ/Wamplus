import MapClient from "@/components/MapClient";
import { getApartments } from "../compare/actions";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ apartmentId?: string; flyTo?: string }>;
}) {
  const apartments = await getApartments();
  const { apartmentId, flyTo } = await searchParams;
  const apartment = apartmentId
    ? apartments.find((a) => a.id === apartmentId)
    : null;
  const initialFlyTo = apartment?.name ?? flyTo;

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] min-h-[400px]">
      <MapClient apartments={apartments} initialFlyTo={initialFlyTo} />
    </div>
  );
}
