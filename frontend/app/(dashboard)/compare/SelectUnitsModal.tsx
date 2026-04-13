'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { UnitWithApartment } from './actions'
import { getUnitsByApartmentIds } from '@/lib/cached-actions'

interface SelectUnitsModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  apartmentIds: string[]
  apartmentNames: Map<string, string>
  existingCompareKeys: Set<string>
  onAddUnit: (apartmentId: string, unitId: string) => Promise<void>
}

function unitKey(apartmentId: string, unitId: string) {
  return `${apartmentId}:${unitId}`
}

function formatPrice(centsOrDollars: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centsOrDollars)
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

export default function SelectUnitsModal({
  isOpen,
  onClose,
  onBack,
  apartmentIds,
  apartmentNames,
  existingCompareKeys,
  onAddUnit,
}: SelectUnitsModalProps) {
  const [units, setUnits] = useState<UnitWithApartment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const filteredUnits = units.filter((unit) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const layout = (unit.layout_name ?? '').toLowerCase()
    const roomType = (unit.room_type ?? '').toLowerCase()
    const aptName = (apartmentNames.get(unit.apartment_id) ?? '').toLowerCase()
    const price = unit.monthly_rent != null ? String(unit.monthly_rent) : ''
    const info = formatUnitInfo(unit).toLowerCase()
    return (
      layout.includes(q) ||
      roomType.includes(q) ||
      aptName.includes(q) ||
      price.includes(q) ||
      info.includes(q)
    )
  })

  const apartmentIdsKey = apartmentIds.join(',')
  useEffect(() => {
    if (isOpen && apartmentIds.length > 0) {
      setLoading(true)
      setError(null)
      setSearchQuery('')
      getUnitsByApartmentIds(apartmentIds)
        .then(setUnits)
        .catch(() => setError('Failed to load units'))
        .finally(() => setLoading(false))
    } else {
      setUnits([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- apartmentIdsKey is stable string of apartmentIds
  }, [isOpen, apartmentIdsKey])

  const handleAddUnit = async (unit: UnitWithApartment) => {
    const key = unitKey(unit.apartment_id, unit.id)
    if (existingCompareKeys.has(key)) return

    setAddingId(unit.id)
    setError(null)
    try {
      await onAddUnit(unit.apartment_id, unit.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add unit')
    } finally {
      setAddingId(null)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-units-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Back to apartment selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 id="select-units-title" className="text-lg font-semibold text-primary-900">
              Select Units to Compare
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 border-b border-zinc-200 px-4 py-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by layout, building, price…"
            className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Search units"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12 text-zinc-500">Loading units…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredUnits.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              {units.length === 0
                ? 'No units found for the selected apartments. Units may need to be added to the database.'
                : 'No matching units.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredUnits.map((unit) => {
                const key = unitKey(unit.apartment_id, unit.id)
                const isAlreadyAdded = existingCompareKeys.has(key)
                const isAdding = addingId === unit.id

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleAddUnit(unit)}
                    disabled={isAlreadyAdded || isAdding}
                    className={`relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-colors ${
                      isAlreadyAdded
                        ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60'
                        : isAdding
                          ? 'cursor-wait border-zinc-400 bg-zinc-50'
                          : 'cursor-pointer border-zinc-200 bg-white hover:bg-primary-300'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-200">
                      {unit.image_url ? (
                        <Image
                          src={unit.image_url}
                          alt={unit.layout_name ?? unit.room_type ?? 'Unit'}
                          width={280}
                          height={210}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-200">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 text-zinc-400"
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
                    <div className="flex flex-col gap-1 p-3">
                      <p className="font-semibold text-zinc-900">
                        {unit.layout_name ?? unit.room_type}
                      </p>
                      <p className="text-sm font-semibold text-zinc-700">
                        {unit.monthly_rent != null
                          ? formatPrice(unit.monthly_rent)
                          : '—'}
                      </p>
                      <p className="text-xs text-zinc-500">{formatUnitInfo(unit)}</p>
                      {isAlreadyAdded && (
                        <p className="mt-1 text-xs font-medium text-zinc-400">Already in compare</p>
                      )}
                      {isAdding && (
                        <p className="mt-1 text-xs font-medium text-zinc-500">Adding…</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-zinc-200 px-4 py-3">
          <p className="text-xs text-zinc-500">
            Click a unit to add it to the compare page
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
