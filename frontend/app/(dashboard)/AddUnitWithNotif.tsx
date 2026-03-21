'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export const ADD_UNIT_NOTIF_DISMISS_KEY = 'wamp-add-unit-notif-dismissed'

export default function AddUnitWithNotif() {
  const [showNotif, setShowNotif] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    setShowNotif(sessionStorage.getItem(ADD_UNIT_NOTIF_DISMISS_KEY) !== '1')
  }, [])

  const handleDismiss = () => {
    setShowNotif(false)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ADD_UNIT_NOTIF_DISMISS_KEY, '1')
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      <Link
        href="/add-unit"
        className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
        aria-label="Add unit"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 13.5H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
          />
        </svg>
      </Link>
      {showNotif && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 w-52 -translate-x-1/2 rounded-lg border border-zinc-300 bg-white py-2.5 pl-3 pr-8 shadow-sm">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-1.5 top-1.5 rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
          <p className="text-xs font-medium text-zinc-800">
            Input your rent information!
          </p>
        </div>
      )}
    </div>
  )
}
