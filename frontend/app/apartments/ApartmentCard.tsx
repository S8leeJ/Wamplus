'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ApartmentUnitsList from './ApartmentUnitsList'

interface ApartmentCardProps {
  apartment: {
    id: string
    name: string
    image_url?: string | null
    address?: string | null
    website?: string | null
  }
  isInCompare: boolean
  compareKeys: string[]
}

export default function ApartmentCard({
  apartment,
  isInCompare,
  compareKeys,
}: ApartmentCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 ${
        expanded ? 'shadow-md ring-2 ring-zinc-200' : 'hover:shadow-md hover:border-zinc-300'
      }`}
    >
      {/* Image */}
        <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="group relative block w-full overflow-hidden bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
        aria-expanded={expanded}
      >
        <div className="aspect-[16/10] w-full">
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
        {/* Badges overlay */}
        {isInCompare && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center justify-center rounded-full bg-amber-500/95 px-2.5 py-1 text-xs font-medium leading-none text-white shadow-sm">
              In compare
            </span>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 rounded-lg -m-2 p-2"
          aria-expanded={expanded}
        >
          <h2 className="text-lg font-semibold text-zinc-900">{apartment.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            {expanded ? (
              <>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                  </svg>
                </span>
                Hide units
              </>
            ) : (
              <>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
                View units
              </>
            )}
          </p>
        </button>
      </div>

      {expanded && (
        <>
          {(apartment.address || apartment.website) && (
          <div className="border-t border-zinc-200 bg-zinc-50/60 px-4 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              {apartment.address && (
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="flex shrink-0 items-center gap-1.5 text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                      </svg>
                      Address
                    </span>
                    <span className="text-zinc-800">{apartment.address}</span>
                  </div>
                  <Link
                    href={`/dashboard/map?apartmentId=${apartment.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M8.157 2.175a1.5 1.5 0 011.686 0l5.25 3.5a1.5 1.5 0 01.525 2.06l-2.432 4.85a1.5 1.5 0 01-.665.665l-4.85 2.432a1.5 1.5 0 01-2.06-.525l-3.5-5.25a1.5 1.5 0 010-1.686l5.25-3.5z" clipRule="evenodd" />
                    </svg>
                    View on map
                  </Link>
                </div>
              )}
              {apartment.website && (
                <div className="flex gap-3">
                  <span className="flex shrink-0 items-center gap-1.5 text-zinc-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                      <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                    </svg>
                    Website
                  </span>
                  <a
                    href={apartment.website.startsWith('http') ? apartment.website : `https://${apartment.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-700"
                  >
                    {apartment.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </dl>
          </div>
          )}
          <ApartmentUnitsList
            apartmentId={apartment.id}
            apartmentName={apartment.name}
            compareKeys={compareKeys}
          />
        </>
      )}
    </article>
  )
}
