"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { type CompareItemWithDetails } from "./actions";
import {
  addToCompare,
  getCompareItems,
  removeFromCompare,
} from "@/lib/cached-actions";
import AddApartmentsModal from "./AddApartmentsModal";
import SelectUnitsModal from "./SelectUnitsModal";

/** Figma Compare (node 38:2): card ~229×250, add column ~227 */
const CARD_WIDTH = "w-[229px]";
const CARD_FIXED_H = "h-[250px]";
const ADD_COL_W = "w-[227px]";

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

  const addUnitCard = (onClick: () => void, ariaLabel: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex ${CARD_FIXED_H} w-full max-w-[54px] flex-col items-center justify-center rounded-[5px] text-[#5c6596] transition-opacity hover:opacity-80`}
      aria-label={ariaLabel}
    >
      <span className="flex h-[53px] w-[54px] items-center justify-center overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-12 w-12"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10.5" />
          <path
            strokeLinecap="round"
            d="M12 8v8M8 12h8"
          />
        </svg>
      </span>
    </button>
  );

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem-3rem)] flex-1 flex-col bg-white p-6">
      <AddApartmentsModal
        isOpen={apartmentsModalOpen}
        onClose={() => setApartmentsModalOpen(false)}
        existingFavoriteIds={new Set()}
        onSelectApartments={handleSelectApartments}
      />
      <SelectUnitsModal
        isOpen={unitsModalOpen}
        onClose={() => setUnitsModalOpen(false)}
        onBack={() => { setUnitsModalOpen(false); setApartmentsModalOpen(true); }}
        apartmentIds={unitsModalApartments.ids}
        apartmentNames={unitsModalApartments.names}
        existingCompareKeys={existingCompareKeys}
        onAddUnit={handleAddUnit}
      />

      {/* Title + filter chips */}
      <div className="mb-4 bg-white">
        <h1 className="text-4xl font-semibold text-[#5c6596]">Compare</h1>
        <div
          className="mt-3 inline-flex max-w-4xl flex-wrap gap-2"
          role="group"
          aria-label="Comparison rows to show"
        >
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFilter(f.id)}
              className={`shrink-0 rounded-[5px] border border-solid border-[#5c6596] px-4 py-1 text-sm font-bold leading-tight transition-colors ${
                activeFilters[f.id]
                  ? "bg-[#5c6596] text-[#fffcf5]"
                  : "bg-white text-[#5c6596] hover:bg-[#f8f7fc]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <svg
              className="h-8 w-8 animate-spin text-[#5c6596]"
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
            <p className="mt-3 text-base text-neutral-700">Loading…</p>
          </div>
        ) : compareItems.length === 0 ? (
          <div className="flex flex-col gap-6 rounded-[5px] border border-[#e5e0d8] bg-white sm:flex-row sm:items-stretch">
            <div
              className={`flex shrink-0 items-center justify-center border-b border-[#e5e0d8] sm:border-b-0 sm:border-r ${ADD_COL_W}`}
            >
              {addUnitCard(
                () => setApartmentsModalOpen(true),
                "Add units to compare"
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center px-6 py-10">
              <p className="text-xl font-medium text-black">
                Select floor plans to compare
              </p>
              <p className="mt-2 text-base text-neutral-500">
                Choose a building, pick one or more units, and they will appear
                here in a grid so you can compare specs at a glance.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:thin]">
          <div className="flex min-w-max flex-col gap-0">
            <div className="flex min-h-[275px] rounded-[5px] border border-[#e5e0d8] bg-white">
              <div
                className={`sticky left-0 z-[1] flex shrink-0 items-center justify-center border-r border-[#e5e0d8] bg-white ${ADD_COL_W}`}
              >
                {addUnitCard(
                  () => setApartmentsModalOpen(true),
                  "Add another unit"
                )}
              </div>
              <div className="flex gap-8 px-4 py-3">
                  {compareItems.map((item) => {
                    const planLabel =
                      item.unit.layout_name?.trim() ||
                      item.unit.room_type ||
                      "Floor plan";
                    return (
                      <div
                        key={item.id}
                        className={`relative flex ${CARD_FIXED_H} ${CARD_WIDTH} shrink-0 flex-col overflow-hidden rounded-[5px] bg-white`}
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCompare(item.id)}
                          className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center overflow-hidden text-neutral-600 transition-colors hover:text-black"
                          aria-label={`Remove ${planLabel} from compare`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5"
                          >
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                        <p className="truncate pr-8 text-xl font-medium text-black">
                          {item.apartment.name}
                        </p>
                        <p className="truncate text-base font-normal text-black">
                          {planLabel}
                        </p>
                        <div className="relative mt-1 h-[140px] w-full shrink-0 overflow-hidden rounded-[5px] bg-[#d9d9d9]">
                          {item.unit.image_url ? (
                            <Image
                              src={item.unit.image_url}
                              alt={planLabel}
                              fill
                              className="object-cover"
                              sizes="229px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 text-neutral-400"
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
                        <p className="mt-auto pt-1 text-center text-xl font-medium tabular-nums text-black">
                          {item.unit.monthly_rent != null
                            ? formatPrice(item.unit.monthly_rent)
                            : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
            </div>

            {visibleFeatures.length > 0 && (
              <div className="border-t border-[#e5e0d8]">
                {visibleFeatures.map((f) => (
                  <div
                    key={f.id}
                    className="flex border-b border-[#e5e0d8] bg-white"
                  >
                    <div
                      className={`sticky left-0 z-[1] flex min-h-[52px] ${ADD_COL_W} shrink-0 items-center justify-center border-r border-[#e5e0d8] bg-white px-2 text-center text-lg font-black text-[#5c6596] [-webkit-text-stroke:0.5px_#5c6596]`}
                    >
                      {f.label}
                    </div>
                    <div className="flex gap-8 px-4 py-2">
                      {compareItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex min-h-[58px] ${CARD_WIDTH} shrink-0 items-center justify-center text-center text-base font-bold text-black`}
                        >
                          {getFeatureValue(item, f.id)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
