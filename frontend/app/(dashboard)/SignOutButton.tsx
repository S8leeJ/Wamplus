'use client'

import { ADD_UNIT_NOTIF_DISMISS_KEY } from './AddUnitWithNotif'

interface SignOutButtonProps {
  action: () => void
  className?: string
  children: React.ReactNode
}

export default function SignOutButton({
  action,
  className,
  children,
}: SignOutButtonProps) {
  const handleClick = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ADD_UNIT_NOTIF_DISMISS_KEY)
    }
  }

  return (
    <form action={action}>
      <button
        type="submit"
        onClick={handleClick}
        className={className}
      >
        {children}
      </button>
    </form>
  )
}
