'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getUnitsByApartmentIds, addToCompare, type UnitWithApartment } from '@/app/(dashboard)/compare/actions'
import { useRouter } from 'next/navigation'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-md"
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
          <div className="flex w-96 shrink-0 flex-col border-r border-zinc-400 bg-zinc-50/50 p-6 overflow-y-auto">
            {apartment && (
              <>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-zinc-400">
                  {apartment.image_url ? (
                    <Image
                      src={apartment.image_url}
                      alt={apartment.name}
                      fill
                      className="object-cover"
                      sizes="320px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
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

                <dl className="mt-6 space-y-4 text-sm">
                  {(apartment.rating != null || apartment.reviews != null) && (
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Rating
                      </dt>
                      <dd className="mt-1 text-zinc-800">
                        {apartment.rating != null && <span className="font-semibold">{Number(apartment.rating).toFixed(1)}</span>}
                        {apartment.rating != null && apartment.reviews != null && ' · '}
                        {apartment.reviews != null && <span>{apartment.reviews.toLocaleString()} reviews</span>}
                      </dd>
                    </div>
                  )}
                  {apartment.address && (
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                        </svg>
                        Address
                      </dt>
                      <dd className="mt-1 flex flex-wrap items-start gap-2 text-zinc-800">
                        <span>{apartment.address}</span>
                        <Link
                          href={`/map?apartmentId=${apartment.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          View on map
                        </Link>
                      </dd>
                    </div>
                  )}
                  {apartment.website && (
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                          <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                        </svg>
                        Website
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={apartment.website.startsWith('http') ? apartment.website : `https://${apartment.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 underline hover:text-primary-700"
                        >
                          {apartment.website.replace(/^https?:\/\//, '')}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </>
            )}
          </div>

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
                <ul className="space-y-3">
                  {filteredUnits.map((unit) => {
                    const key = apartment ? unitKey(apartment.id, unit.id) : ''
                    const isInCompare = compareKeysSet.has(key)
                    const isAdding = addingId === unit.id

                    return (
                      <li
                        key={unit.id}
                        className="flex items-center gap-4 rounded-xl border border-zinc-400 bg-white p-3 shadow-sm transition-shadow hover:shadow"
                      >
                        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                          {unit.image_url ? (
                            <Image
                              src={unit.image_url}
                              alt={unit.layout_name ?? unit.room_type ?? 'Unit'}
                              fill
                              className="object-cover"
                              sizes="112px"
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
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900">{unit.layout_name ?? unit.room_type}</p>
                          <p className="text-xs text-zinc-500">{formatUnitInfo(unit)}</p>
                          {unit.monthly_rent != null && (
                            <p className="mt-0.5 text-sm font-semibold text-zinc-800">{formatPrice(unit.monthly_rent)}</p>
                          )}
                        </div>
                        <div className="shrink-0">
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
                              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
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
