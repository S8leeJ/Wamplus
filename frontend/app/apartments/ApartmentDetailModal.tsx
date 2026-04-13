'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { type UnitWithApartment } from '@/app/(dashboard)/compare/actions'
import { getUnitsByApartmentIds, addToCompare } from '@/lib/cached-actions'
import { useRouter } from 'next/navigation'
import {
  HARDCODED_SMART_HOUSING,
  HARDCODED_UNITS_LEFT,
} from '@/lib/apartment-display'

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

interface ApartmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  apartment: {
    id: string
    name: string
    image_url?: string | null
    address?: string | null
    website?: string | null
    rating?: number | null
    reviews?: number | null
  } | null
  compareKeys: string[]
  onAddedToCompare?: () => void
}

const BEDROOM_OPTIONS = [null, 1, 2, 3, 4] as const
const BATHROOM_OPTIONS = [null, 1, 2, 3, 4] as const

export default function ApartmentDetailModal({
  isOpen,
  onClose,
  apartment,
  compareKeys,
  onAddedToCompare,
}: ApartmentDetailModalProps) {
  const [units, setUnits] = useState<UnitWithApartment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null)
  const [bathroomFilter, setBathroomFilter] = useState<number | null>(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const router = useRouter()
  const compareKeysSet = useMemo(() => new Set(compareKeys), [compareKeys])

  useEffect(() => {
    if (isOpen && apartment) {
      setLoading(true)
      setError(null)
      setSearchQuery('')
      setBedroomFilter(null)
      setBathroomFilter(null)
      setMinPrice('')
      setMaxPrice('')
      getUnitsByApartmentIds([apartment.id])
        .then(setUnits)
        .catch(() => setError('Failed to load units'))
        .finally(() => setLoading(false))
    } else {
      setUnits([])
    }
  }, [isOpen, apartment?.id])

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const layout = (unit.layout_name ?? '').toLowerCase()
        const roomType = (unit.room_type ?? '').toLowerCase()
        const info = formatUnitInfo(unit).toLowerCase()
        if (!layout.includes(q) && !roomType.includes(q) && !info.includes(q)) return false
      }
      if (bedroomFilter != null && (unit.bedrooms == null || unit.bedrooms < bedroomFilter)) return false
      if (bathroomFilter != null && (unit.bathrooms == null || unit.bathrooms < bathroomFilter)) return false
      const rent = unit.monthly_rent
      if (minPrice) {
        const min = Number(minPrice)
        if (!Number.isNaN(min) && (rent == null || rent < min)) return false
      }
      if (maxPrice) {
        const max = Number(maxPrice)
        if (!Number.isNaN(max) && (rent == null || rent > max)) return false
      }
      return true
    })
  }, [units, searchQuery, bedroomFilter, bathroomFilter, minPrice, maxPrice])

  const handleAddToCompare = async (unitId: string) => {
    if (!apartment) return
    const key = unitKey(apartment.id, unitId)
    if (compareKeysSet.has(key)) return
    setAddingId(unitId)
    setError(null)
    try {
      const result = await addToCompare(apartment.id, unitId)
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-2 backdrop-blur-md"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apartment-detail-title"
    >
      <div
        className="flex h-[90vh] w-full max-w-[min(96rem,95vw)] flex-col overflow-hidden rounded-2xl border border-zinc-400 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-400 px-4 py-3">
          <h2 id="apartment-detail-title" className="text-lg font-bold text-primary-900">
            {apartment?.name ?? 'Apartment Details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: Apartment details */}
          <aside className="flex w-[min(24rem,100%)] shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-gradient-to-b from-primary-50/90 via-white to-zinc-50/40">
            {apartment && (
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="relative overflow-hidden rounded-2xl bg-zinc-200 shadow-md ring-1 ring-zinc-200/80">
                  <div className="relative aspect-[16/10] w-full">
                    {apartment.image_url ? (
                      <Image
                        src={apartment.image_url}
                        alt={apartment.name}
                        fill
                        className="object-cover"
                        sizes="384px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full min-h-[140px] w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">
                    Building
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold leading-snug text-zinc-900">
                    {apartment.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-primary-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Units left
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-primary-800">
                      {HARDCODED_UNITS_LEFT}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary-200/90 bg-primary-50/80 p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-primary-800/80">
                      Smart housing
                    </p>
                    <p className="mt-2 inline-flex items-center rounded-full bg-primary-700/15 px-2 py-0.5 text-xs font-semibold text-primary-900">
                      {HARDCODED_SMART_HOUSING}
                    </p>
                  </div>
                </div>

                <div className="h-px w-full bg-zinc-200/90" aria-hidden />

                <div className="space-y-3">
                  {(apartment.rating != null || apartment.reviews != null) && (
                    <div className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white/80 p-3.5 shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-500">Rating</p>
                        <p className="mt-0.5 text-sm text-zinc-900">
                          {apartment.rating != null && (
                            <span className="font-semibold">{Number(apartment.rating).toFixed(1)}</span>
                          )}
                          {apartment.rating != null && apartment.reviews != null && (
                            <span className="text-zinc-400"> · </span>
                          )}
                          {apartment.reviews != null && (
                            <span className="text-zinc-700">{apartment.reviews.toLocaleString()} reviews</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {apartment.address && (
                    <div className="rounded-xl border border-zinc-200/90 bg-white/80 p-3.5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-500">Address</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-zinc-800">{apartment.address}</p>
                          <Link
                            href={`/map?apartmentId=${apartment.id}`}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            View on map
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {apartment.website && (
                    <div className="rounded-xl border border-zinc-200/90 bg-white/80 p-3.5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-500">Website</p>
                          <a
                            href={apartment.website.startsWith('http') ? apartment.website : `https://${apartment.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-primary-800 transition-colors hover:border-primary-300 hover:bg-primary-50/60"
                          >
                            <span className="truncate">
                              {apartment.website.replace(/^https?:\/\//, '')}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Right: Scrollable units with filters */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-400 bg-white px-4 py-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search units…"
                className="min-w-[140px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label="Search units"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Beds</span>
                <select
                  value={bedroomFilter ?? ''}
                  onChange={(e) => setBedroomFilter(e.target.value === '' ? null : Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Any</option>
                  {BEDROOM_OPTIONS.filter((v) => v != null).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Baths</span>
                <select
                  value={bathroomFilter ?? ''}
                  onChange={(e) => setBathroomFilter(e.target.value === '' ? null : Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Any</option>
                  {BATHROOM_OPTIONS.filter((v) => v != null).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min $"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  aria-label="Minimum price"
                />
                <span className="text-zinc-400">–</span>
                <input
                  type="number"
                  placeholder="Max $"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="h-6 w-6 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-2 text-sm text-zinc-500">Loading units…</span>
                </div>
              ) : error ? (
                <p className="py-8 text-center text-sm text-red-600">{error}</p>
              ) : filteredUnits.length === 0 ? (
                <div className="py-16 text-center text-sm text-zinc-500">
                  {units.length === 0 ? 'No units for this building yet.' : 'No matching units.'}
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredUnits.map((unit) => {
                    const key = apartment ? unitKey(apartment.id, unit.id) : ''
                    const isInCompare = compareKeysSet.has(key)
                    const isAdding = addingId === unit.id

                    return (
                      <li
                        key={unit.id}
                        className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-sm transition-all hover:bg-primary-300 hover:shadow-md"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100">
                          {unit.image_url ? (
                            <Image
                              src={unit.image_url}
                              alt={unit.layout_name ?? unit.room_type ?? 'Unit'}
                              fill
                              className="object-cover"
                              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-zinc-900">
                              {unit.layout_name ?? unit.room_type}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">{formatUnitInfo(unit)}</p>
                          </div>
                          {unit.monthly_rent != null && (
                            <p className="mt-2 text-sm font-semibold text-zinc-800">{formatPrice(unit.monthly_rent)}</p>
                          )}
                          <div className="mt-3">
                            {isInCompare ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                In compare
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCompare(unit.id)}
                                disabled={isAdding}
                                className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                              >
                                {isAdding ? (
                                  <>
                                    <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Adding…
                                  </>
                                ) : (
                                  <>Add to compare</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
