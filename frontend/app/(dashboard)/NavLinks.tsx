'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/apartments', label: 'Apartments' },
  { href: '/compare', label: 'Compare' },
  { href: '/map', label: 'Wampus Map' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex gap-6">
      {LINKS.map(({ href, label }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors hover:text-black ${
              isActive ? 'font-bold text-black' : 'font-medium text-black'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
