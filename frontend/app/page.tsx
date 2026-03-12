import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4 sm:px-8 sm:py-5 md:px-12 md:py-6">
        <span className="text-xl font-bold tracking-tight text-indigo-900 sm:text-2xl">
          WAMP+
        </span>
        <div className="flex items-center gap-8 sm:gap-10">
          <span className="hidden text-sm font-medium text-slate-500 sm:inline">
            MADE BY UT STUDENTS FOR UT STUDENTS
          </span>
          <Link
            href="/login"
            className="text-base font-semibold text-indigo-900 transition-colors hover:text-indigo-700 sm:text-lg"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        className="relative min-h-[50vh] md:min-h-[60vh] flex flex-col items-start justify-start gap-8 bg-cover bg-center bg-no-repeat px-6 py-10 sm:px-8 sm:py-14 md:px-12 md:py-20"
        style={{ backgroundImage: "url(/wampus.png)" }}
      >
        <h1 className="text-7xl font-bold tracking-tight text-indigo-900 sm:text-8xl md:text-9xl">
          WAMP+
        </h1>
        <Link
          href="/dashboard/compare"
          className="rounded-full bg-indigo-900 px-10 py-4 text-xl font-bold text-white transition-colors hover:bg-indigo-800 sm:px-12 sm:py-5 sm:text-2xl"
        >
          Compare
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20 md:px-12 md:py-24 bg-stone-50">
        {/* Section 1 */}
        <section className="mb-28 text-center md:mb-32">
          <p className="text-base font-semibold uppercase tracking-widest text-slate-500 sm:text-lg">
            EASIEST WAY TO
          </p>
          <h2 className="mt-3 text-6xl font-bold tracking-tight text-indigo-900 sm:text-7xl md:text-8xl">
            COMPARE
          </h2>
          <p className="mt-3 text-2xl font-medium text-slate-500 sm:text-3xl">
            WAMPUS APARTMENTS
          </p>
        </section>

        {/* Section 2: Unfiltered with Review Cards */}
        <section className="relative mb-28 min-h-[420px] md:mb-32 md:min-h-[500px]">
          <div className="flex flex-col items-center gap-12 md:flex-row md:items-center md:justify-between">
            <div className="relative h-[360px] w-full max-w-lg md:h-[440px]">
              {/* Card 1 */}
              <div
                className="absolute left-0 top-0 w-56 rounded-xl bg-white p-5 shadow-xl ring-1 ring-stone-200"
                style={{ transform: "rotate(-6deg)" }}
              >
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">★</span>
                  ))}
                </div>
                <p className="text-base font-bold text-slate-800">5.0/5.0</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-slate-600">
                    F
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Looking awesome!
                  </p>
                </div>
              </div>
              {/* Card 2 */}
              <div
                className="absolute left-12 top-24 w-60 rounded-xl bg-white p-5 shadow-xl ring-1 ring-stone-200 md:left-20 md:top-28"
                style={{ transform: "rotate(3deg)" }}
              >
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">★</span>
                  ))}
                </div>
                <p className="text-base font-bold text-slate-800">
                  Mold infested
                </p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  I&apos;m going to die in this house
                </p>
              </div>
              {/* Card 3 */}
              <div
                className="absolute bottom-20 left-6 w-52 rounded-xl bg-white p-5 shadow-xl ring-1 ring-stone-200 md:bottom-24"
                style={{ transform: "rotate(-4deg)" }}
              >
                <p className="text-base font-bold text-slate-800">
                  Hidden fees!!
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-slate-600">
                    F
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Description
                  </p>
                </div>
              </div>
              {/* Card 4 */}
              <div
                className="absolute bottom-0 right-8 w-60 rounded-xl bg-white p-5 shadow-xl ring-1 ring-stone-200 md:right-12"
                style={{ transform: "rotate(5deg)" }}
              >
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">★</span>
                  ))}
                </div>
                <p className="text-base font-bold text-slate-800">
                  No water for a week
                </p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  I hate it here
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-slate-600">
                    F
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Reviewer</p>
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-6xl font-bold tracking-tight text-red-800 sm:text-7xl md:text-8xl">
                UNFILTERED
              </h2>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-28 flex flex-col gap-10 md:mb-32 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="space-y-4">
            <p className="text-xl font-semibold text-indigo-900 sm:text-2xl">
              MOST ACCURATE SOURCE OF INFORMATION
            </p>
            <p className="text-3xl font-bold text-red-800 sm:text-4xl md:text-5xl">
              ALL IN ONE PLACE
            </p>
            <p className="text-2xl font-bold text-indigo-900 sm:text-3xl">
              WEST CAMPUS ONLY
            </p>
            <p className="text-lg font-medium text-slate-500">Austin, TX</p>
          </div>
          <img
            src="/wampus.png"
            alt="West Campus Austin"
            className="h-72 w-full max-w-lg shrink-0 rounded-xl object-cover object-right shadow-lg md:h-96 md:max-w-md"
          />
        </section>

        {/* CTA */}
        <div className="flex flex-col items-center gap-6 pb-24">
          <Link
            href="/dashboard/compare"
            className="rounded-full bg-indigo-900 px-14 py-5 text-xl font-bold text-white transition-colors hover:bg-indigo-800 sm:px-16 sm:py-6 sm:text-2xl"
          >
            Compare Apartments
          </Link>
          <p className="text-base font-medium text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-900 underline decoration-2 underline-offset-2 hover:text-indigo-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
