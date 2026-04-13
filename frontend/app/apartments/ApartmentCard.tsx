'use client'

import Image from 'next/image'
import { HARDCODED_UNITS_LEFT } from '@/lib/apartment-display'

interface ApartmentCardProps {
  apartment: {
    id: string
    name: string
    image_url?: string | null
    address?: string | null
    website?: string | null
    rating?: number | null
    reviews?: number | null
  }
  isInCompare: boolean
  isFavorited: boolean
  onOpen: (apartment: ApartmentCardProps['apartment']) => void
  onToggleFavorite: (apartmentId: string, isFavorited: boolean) => void
}

export default function ApartmentCard({
  apartment,
  isInCompare,
  isFavorited,
  onOpen,
  onToggleFavorite,
}: ApartmentCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:bg-primary-300">
      <button
        type="button"
        onClick={() => onOpen(apartment)}
        className="group relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
      >
        <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100">
          {apartment.image_url ? (
            <Image
              src={apartment.image_url}
              alt={apartment.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          )}
        </div>
        {isInCompare && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center justify-center rounded-full bg-amber-500/95 px-2.5 py-1 text-xs font-medium leading-none text-white shadow-sm">
              In compare
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpen(apartment)}
            className="-m-2 flex-1 rounded-lg p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
          >
            <h2 className="text-lg font-semibold text-zinc-900">{apartment.name}</h2>
            <p className="mt-0.5 text-xs font-medium text-zinc-600">
              {HARDCODED_UNITS_LEFT} units left
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
              View units
            </p>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(apartment.id, isFavorited)
            }}
            className="mt-0.5 shrink-0 rounded-full p-1.5 transition-colors hover:bg-amber-50"
            aria-label={isFavorited ? `Remove ${apartment.name} from favorites` : `Add ${apartment.name} to favorites`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isFavorited ? 0 : 1.5}
              className={`h-5 w-5 transition-colors ${isFavorited ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}
