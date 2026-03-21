'use client'

import Image from 'next/image'

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
  onOpen: (apartment: ApartmentCardProps['apartment']) => void
}

export default function ApartmentCard({
  apartment,
  isInCompare,
  onOpen,
}: ApartmentCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-zinc-300">
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
        <button
          type="button"
          onClick={() => onOpen(apartment)}
          className="-m-2 rounded-lg p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
        >
          <h2 className="text-lg font-semibold text-zinc-900">{apartment.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </span>
            View units
          </p>
        </button>
      </div>
    </article>
  )
}
