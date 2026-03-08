import Link from "next/link";
import { signOut } from "../login/actions";
import NavLinks from "./NavLinks";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="border-b border-primary-200 bg-primary-300">
        <div className="mx-auto flex h-18 max-w-9xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-3xl font-light tracking-tight text-primary-700"
            >
              WAMP+
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/add-unit"
              className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
              aria-label="Add unit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <Link
              href="/dashboard/notifications"
              className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
              aria-label="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-2.684 1.464-2.684 2.187v.75C18 20.43 16.43 22 14.25 22h-4.5C7.57 22 6 20.43 6 18.75v-.75c0-.723-1.14-1.617-2.684-2.187a.75.75 0 01-.297-1.206C6.95 13.807 7.75 11.873 7.75 9.75V9A6.75 6.75 0 015.25 9z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-primary-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="flex min-h-0 flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
