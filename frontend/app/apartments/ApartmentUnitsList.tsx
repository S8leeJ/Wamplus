'use client'

import { useEffect, useState } from 'react'
import { getUnitsByApartmentIds, addToCompare } from '@/app/(dashboard)/compare/actions'
import type { UnitWithApartment } from '@/app/(dashboard)/compare/actions'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

function unitKey(apartmentId: string, unitId: string) {
  return `${apartmentId}:${unitId}`
}

function formatUnitInfo(unit: UnitWithApartment) {
  const parts: string[] = []
  if (unit.bedrooms != null) parts.push(`${unit.bedrooms} bed`)
  if (unit.bathrooms != null) parts.push(`${unit.bathrooms} bath`)
  if (unit.sq_ft != null) parts.push(`${unit.sq_ft} sqft`)
  if (unit.floor != null) parts.push(`Floor ${unit.floor}`)
  if (unit.windows != null) parts.push(unit.windows)
  return parts.length > 0 ? parts.join(' · ') : (unit.layout_name ?? unit.room_type)
}

interface ApartmentUnitsListProps {
  apartmentId: string
  apartmentName: string
  compareKeys: string[]
  onAddedToCompare?: () => void
}

export default function ApartmentUnitsList({
  apartmentId,
  apartmentName,
  compareKeys,
  onAddedToCompare,
}: ApartmentUnitsListProps) {
  const [units, setUnits] = useState<UnitWithApartment[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const compareKeysSet = new Set(compareKeys)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getUnitsByApartmentIds([apartmentId])
      .then(setUnits)
      .catch(() => setError('Failed to load units'))
      .finally(() => setLoading(false))
  }, [apartmentId])

  const handleAddToCompare = async (unitId: string) => {
    const key = unitKey(apartmentId, unitId)
    if (compareKeysSet.has(key)) return
    setAddingId(unitId)
    setError(null)
    try {
      const result = await addToCompare(apartmentId, unitId)
      if (result.ok) {
        router.refresh()
        onAddedToCompare?.()
      } else {
        setError(result.error ?? 'Failed to add')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setAddingId(null)
    }
  }

  if (loading) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-8">
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading units…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-t border-zinc-200 bg-red-50/80 px-4 py-4">
        <p className="text-center text-sm text-red-600">{error}</p>
      </div>
    )
  }
  
  if (units.length === 0) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center">
        <p className="text-sm text-zinc-500">No units for this building yet.</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          Add units from the dashboard to compare them.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Units
      </p>
      <ul className="space-y-2">
        {units.map((unit) => {
          const key = unitKey(unit.apartment_id, unit.id)
          const isInCompare = compareKeysSet.has(key)
          const isAdding = addingId === unit.id

          return (
            <li
              key={unit.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {unit.image_url ? (
                  <Image
                    src={unit.image_url}
                    alt={unit.layout_name ?? unit.room_type ?? 'Unit'}
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-zinc-300"
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
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">
                  {unit.layout_name ?? unit.room_type}
                </p>
                <p className="text-xs text-zinc-500">{formatUnitInfo(unit)}</p>
              </div>
              <div className="shrink-0">
                {isInCompare ? (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium leading-none text-emerald-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    In compare
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddToCompare(unit.id)}
                    disabled={isAdding}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isAdding ? (
                      <>
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden
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
                        Adding…
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add to compare
                      </>
                    )}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
