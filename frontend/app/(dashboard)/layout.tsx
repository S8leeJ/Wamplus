import Link from "next/link";
import { signOut } from "../login/actions";
import AddUnitWithNotif from "./AddUnitWithNotif";
import NavLinks from "./NavLinks";
import SignOutButton from "./SignOutButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="overflow-visible border-b border-primary-200 bg-primary-300">
        <div className="mx-auto flex h-18 max-w-9xl items-center justify-between gap-6 overflow-visible px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/apartments"
              className="text-3xl font-light tracking-tight text-primary-700"
            >
              WAMP+
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-2">
            <AddUnitWithNotif />
            <Link
              href="/notifications"
              className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
              aria-label="Notifications"
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
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
            </Link>
            <SignOutButton
              action={signOut}
              className="rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-primary-100 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Sign out
            </SignOutButton>
        </div>
      </div>
    </nav>
    <main className="flex min-h-0 flex-1 flex-col p-6">{children}</main>
  </div>
  );
}
