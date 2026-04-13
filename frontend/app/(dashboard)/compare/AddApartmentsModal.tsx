'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import type { ApartmentForCompare } from './actions'
import { getApartments, getFavoriteApartmentIds } from '@/lib/cached-actions'

type Tab = 'all' | 'favorites'

interface AddApartmentsModalProps {
  isOpen: boolean
  onClose: () => void
  existingFavoriteIds: Set<string>
  onSelectApartments: (apartmentIds: string[], apartmentNames: Map<string, string>) => void
}

export default function AddApartmentsModal({
  isOpen,
  onClose,
  existingFavoriteIds,
  onSelectApartments,
}: AddApartmentsModalProps) {
  const [apartments, setApartments] = useState<ApartmentForCompare[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const filteredApartments = useMemo(() => {
    let list = apartments
    if (activeTab === 'favorites') {
      list = list.filter((apt) => favoriteIds.has(apt.id))
    }
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((apt) => {
      const name = apt.name.toLowerCase()
      const address = (apt.address ?? '').toLowerCase()
      return name.includes(q) || address.includes(q)
    })
  }, [apartments, searchQuery, activeTab, favoriteIds])

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open requires immediate loading state */
      setLoading(true)
      setError(null)
      setSelectedIds(new Set())
      setSearchQuery('')
      setActiveTab('all')
      Promise.all([getApartments(), getFavoriteApartmentIds()])
        .then(([apts, favIds]) => {
          setApartments(apts)
          setFavoriteIds(favIds)
        })
        .catch(() => setError('Failed to load apartments'))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const toggleSelection = (id: string) => {
    if (existingFavoriteIds.has(id)) return
    setSelectedIds(new Set([id]))
  }

  const handleSubmit = () => {
    const toAdd = [...selectedIds].filter((id) => !existingFavoriteIds.has(id))
    if (toAdd.length === 0) {
      onClose()
      return
    }
    const apartmentNames = new Map(apartments.map((a) => [a.id, a.name]))
    onSelectApartments(toAdd, apartmentNames)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-apartments-title"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 id="add-apartments-title" className="text-lg font-bold text-primary-900">
            Choose Apartment Building
          </h2>
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

        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-4 py-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by building name or address…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Search apartment buildings"
          />
          <div className="flex shrink-0 rounded-lg border border-zinc-200 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-primary-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Favorites{favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ''}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12 text-zinc-500">Loading apartments…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredApartments.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              {apartments.length === 0
                ? 'No apartments found.'
                : activeTab === 'favorites' && favoriteIds.size === 0
                  ? 'No favorite apartments yet. Star apartments on the Apartments page to see them here.'
                  : 'No matching apartments.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredApartments.map((apt) => {
                const isAlreadyFavorite = existingFavoriteIds.has(apt.id)
                const isSelected = selectedIds.has(apt.id)
                return (
                  <label
                    key={apt.id}
                    className={`relative flex flex-col overflow-hidden rounded-lg border-2 transition-colors ${
                      isAlreadyFavorite
                        ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60'
                        : isSelected
                          ? 'cursor-pointer border-primary-700 bg-primary-50'
                          : 'cursor-pointer border-zinc-200 bg-white hover:bg-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="apartment-selection"
                      checked={isSelected || isAlreadyFavorite}
                      disabled={isAlreadyFavorite}
                      onChange={() => toggleSelection(apt.id)}
                      className="sr-only"
                    />
                    <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-200">
                      {apt.image_url ? (
                        <Image
                          src={apt.image_url}
                          alt={apt.name}
                          width={280}
                          height={210}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-200" aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <p className="font-semibold text-zinc-900">{apt.name}</p>
                      {apt.address && (
                        <p className="flex items-center gap-1 text-xs text-zinc-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                          </svg>
                          {apt.address}
                        </p>
                      )}
                      {isAlreadyFavorite && (
                        <p className="text-xs text-zinc-400">Already added</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
            className="rounded-lg bg-primary-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next: Select units
          </button>
        </div>
      </div>
    </div>
  )
}
