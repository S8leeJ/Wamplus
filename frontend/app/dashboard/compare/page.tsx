"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  addToCompare,
  getCompareItems,
  removeFromCompare,
  type CompareItemWithDetails,
} from "./actions";
import AddApartmentsModal from "./AddApartmentsModal";
import SelectUnitsModal from "./SelectUnitsModal";

const CARD_WIDTH = "w-52";

const FEATURES = [
  { id: "bedrooms", label: "Bedrooms" },
  { id: "bathrooms", label: "Bathrooms" },
  { id: "sq_ft", label: "Floor Area" },
  { id: "floor", label: "Floor" },
  { id: "windows", label: "Windows" },
  { id: "amenities", label: "Amenities" },
] as const;

function compareKey(apartmentId: string, unitId: string) {
  return `${apartmentId}:${unitId}`;
}

function formatPrice(centsOrDollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centsOrDollars);
}

function getFeatureValue(
  item: CompareItemWithDetails,
  featureId: (typeof FEATURES)[number]["id"]
): string {
  switch (featureId) {
    case "price":
      return item.unit.monthly_rent != null
        ? formatPrice(item.unit.monthly_rent)
        : "—";
    case "bedrooms":
      return item.unit.bedrooms != null ? String(item.unit.bedrooms) : "—";
    case "bathrooms":
      return item.unit.bathrooms != null ? String(item.unit.bathrooms) : "—";
    case "sq_ft":
      return item.unit.sq_ft != null ? `${item.unit.sq_ft} sq ft` : "—";
    case "floor":
      return item.unit.floor != null ? String(item.unit.floor) : "—";
    case "windows":
      return item.unit.windows != null ? item.unit.windows : "—";
    case "amenities":
      return "—";
    default:
      return "—";
  }
}

export default function ComparePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(
    FEATURES.reduce((acc, f) => ({ ...acc, [f.id]: true }), {})
  );
  const [compareItems, setCompareItems] = useState<CompareItemWithDetails[]>([]);
  const [apartmentsModalOpen, setApartmentsModalOpen] = useState(false);
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const [unitsModalApartments, setUnitsModalApartments] = useState<{
    ids: string[];
    names: Map<string, string>;
  }>({ ids: [], names: new Map() });
  const [loading, setLoading] = useState(true);

  const fetchCompareItems = useCallback(async () => {
    const data = await getCompareItems();
    setCompareItems(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCompareItems().finally(() => setLoading(false));
  }, [fetchCompareItems]);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleFeatures = FEATURES.filter(
    (f) => activeFilters[f.id] !== false
  );
  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  const handleSelectApartments = (
    apartmentIds: string[],
    apartmentNames: Map<string, string>
  ) => {
    setUnitsModalApartments({ ids: apartmentIds, names: apartmentNames });
    setUnitsModalOpen(true);
  };

  const handleAddUnit = async (apartmentId: string, unitId: string) => {
    const result = await addToCompare(apartmentId, unitId);
    if (!result.ok) throw new Error(result.error);
    await fetchCompareItems();
  };

  const handleRemoveFromCompare = async (compareItemId: string) => {
    await removeFromCompare(compareItemId);
    await fetchCompareItems();
  };

  const existingCompareKeys = new Set(
    compareItems.map((c) => compareKey(c.apartment_id, c.unit_id))
  );

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem-3rem)] bg-white flex-1 flex-col p-6">
      <AddApartmentsModal
        isOpen={apartmentsModalOpen}
        onClose={() => setApartmentsModalOpen(false)}
        existingFavoriteIds={new Set()}
        onSelectApartments={handleSelectApartments}
      />
      <SelectUnitsModal
        isOpen={unitsModalOpen}
        onClose={() => setUnitsModalOpen(false)}
        apartmentIds={unitsModalApartments.ids}
        apartmentNames={unitsModalApartments.names}
        existingCompareKeys={existingCompareKeys}
        onAddUnit={handleAddUnit}
      />

      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary-800">
          Compare
        </h1>
      </header>

      {/* Filters - always visible pills */}
      <div className="mb-6 pb-6 shadow-[0_1px_0_0_rgba(0,0,0,0.16)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
            aria-expanded={filtersOpen}
          >
            Filters
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600">
              {activeCount}/{FEATURES.length}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 text-primary-500 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {filtersOpen && (
            <div className="flex flex-wrap gap-4">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFilter(f.id)}
                  className={`rounded-md px-4 py-1 text-sm font-medium transition-colors ${
                    activeFilters[f.id]
                      ? "bg-primary-700 text-white hover:bg-primary-600"
                      : "border border-primary-200 bg-white text-zinc-700 hover:border-primary-300 hover:bg-primary-50/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

       
        {/* Right: Unit cards + comparison table or empty state */}
        <div className="min-w-0 flex-1 overflow-auto rounded-xl bg-white/80 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <svg
                className="h-8 w-8 animate-spin text-primary-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            </div>
          ) : compareItems.length === 0 ? (
            <div className="flex gap-4 items-center">
              <button
                type="button"
                onClick={() => setApartmentsModalOpen(true)}
                className={`flex h-[280px] ${CARD_WIDTH} shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-white text-primary-400 transition-colors hover:border-primary-300 hover:bg-primary-50/50`}
                aria-label="Add units to compare"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                </span>
                <span className="text-sm font-medium">Add unit</span>
              </button>
              <div className="flex flex-col py-8">
                <p className="text-lg font-medium ml-8 text-zinc-500">
                  Your comparing list is empty
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Click the + button to add units to compare
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Unit cards row */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setApartmentsModalOpen(true)}
                  className={`flex h-[280px] ${CARD_WIDTH} shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-white text-primary-400 transition-colors hover:border-primary-300 hover:bg-primary-50/50`}
                  aria-label="Add another unit"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-900">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-6 w-6"
                    >
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium">Add unit</span>
                </button>
                {compareItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative flex h-[280px] ${CARD_WIDTH} shrink-0 flex-col overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm`}
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCompare(item.id)}
                      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-zinc-500 transition-colors hover:border-primary-300 hover:bg-white hover:text-primary-700"
                      aria-label={`Remove ${item.apartment.name} from compare`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                    <div className="flex flex-col px-5 py-5">
                      <p className="truncate w-full text-lg font-semibold text-black">
                        {item.apartment.name}
                      </p>
                      <p className="truncate w-full text-md text-black">
                        {item.unit.layout_name ?? item.unit.room_type}
                      </p>
                    </div>
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-primary-100">
                      {item.unit.image_url ? (
                        <Image
                          src={item.unit.image_url}
                          alt={item.unit.layout_name ?? item.unit.room_type ?? "Unit"}
                          fill
                          className="object-cover"
                          sizes="208px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 text-primary-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center px-2  text-md font-bold text-center">
                      <p className="text-md font-bold text-zinc-800">
                        {item.unit.monthly_rent != null
                          ? formatPrice(item.unit.monthly_rent)
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison table - columns aligned with unit cards */}
              {visibleFeatures.length > 0 && (
                <div className="flex flex-col gap-0 overflow-x-auto">
                  {/* Data rows */}
                  {visibleFeatures.map((f, i) => (
                    <div
                      key={f.id}
                      className={`flex min-w-max gap-4 ${i % 2 === 1 ? "bg-primary-50/50" : ""}`}
                    >
                      <div className={`flex h-12 ${CARD_WIDTH} shrink-0 items-center border-b border-primary-100 text-md font-bold text-primary-800`}>
                        {f.label}
                      </div>
                      {compareItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex h-12 ${CARD_WIDTH} shrink-0 items-center justify-center border-b border-primary-100 text-center text-md font-bold text-zinc-600`}
                        >
                          {getFeatureValue(item, f.id)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
}
