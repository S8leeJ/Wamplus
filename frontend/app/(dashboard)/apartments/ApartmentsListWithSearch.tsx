'use client'

import { useState, useMemo } from 'react'
import ApartmentCard from '@/app/apartments/ApartmentCard'
import ApartmentDetailModal from '@/app/apartments/ApartmentDetailModal'

export type ApartmentForList = {
  id: string
  name: string
  image_url?: string | null
  address?: string | null
  website?: string | null
  rating?: number | null
  reviews?: number | null
}

interface ApartmentsListWithSearchProps {
  apartments: ApartmentForList[]
  apartmentIdsInCompare: Set<string>
  compareKeys: string[]
}

export default function ApartmentsListWithSearch({
  apartments,
  apartmentIdsInCompare,
  compareKeys,
}: ApartmentsListWithSearchProps) {
  const [search, setSearch] = useState('')
  const [selectedApartment, setSelectedApartment] = useState<ApartmentForList | null>(null)

  const filteredApartments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return apartments
    return apartments.filter((a) => a.name.toLowerCase().includes(q))
  }, [apartments, search])

  return (
    <>
      <ApartmentDetailModal
        isOpen={selectedApartment != null}
        onClose={() => setSelectedApartment(null)}
        apartment={selectedApartment}
        compareKeys={compareKeys}
      />

      <div className="mb-6">
        <label htmlFor="apartment-search" className="sr-only">
          Search apartments
        </label>
        <input
          id="apartment-search"
          type="search"
          placeholder="Search apartments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-zinc-900 bg-white px-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          aria-describedby={search ? 'search-results' : undefined}
        />
        {search && (
          <p id="search-results" className="mt-2 text-sm text-zinc-500">
            {filteredApartments.length === 0
              ? 'No apartments match your search.'
              : `Showing ${filteredApartments.length} of ${apartments.length} apartments`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredApartments.map((apartment) => (
          <ApartmentCard
            key={apartment.id}
            apartment={apartment}
            isInCompare={apartmentIdsInCompare.has(apartment.id)}
            onOpen={setSelectedApartment}
          />
        ))}
      </div>

      {filteredApartments.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-zinc-500">
            {apartments.length === 0
              ? 'No apartments found.'
              : 'No apartments match your search.'}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {apartments.length === 0
              ? 'Add apartments in the dashboard to see them here.'
              : 'Try a different search term.'}
          </p>
        </div>
      )}
    </>
  )
}
