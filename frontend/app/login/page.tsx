import Link from "next/link";
import { login } from "./actions";

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-5 py-3.5 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-stone-200 bg-white px-10 py-10 shadow-lg sm:px-12 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-900 sm:text-4xl">
          Sign In
        </h1>
        {searchParams?.message && (
          <p className="rounded-xl bg-stone-100 px-5 py-4 text-base font-medium text-slate-700">
            {searchParams.message}
          </p>
        )}
        {searchParams?.error && (
          <p className="rounded-xl bg-red-50 px-5 py-4 text-base font-semibold text-red-700">
            {searchParams.error}
          </p>
        )}
        <form className="flex flex-col gap-6 text-slate-900" action={login}>
          <div className="space-y-2">
            <label
              className="block text-base font-semibold text-slate-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-base font-semibold text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-indigo-900 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-indigo-800"
          >
            Sign In
          </button>
          <p className="text-center text-base font-medium text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-indigo-900 underline decoration-2 underline-offset-2 hover:text-indigo-700"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
