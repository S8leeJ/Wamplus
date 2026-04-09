import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function isUtexasEmail(email?: string | null) {
  return !!email && email.toLowerCase().includes('utexas')
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      const sessionUser = exchangeData?.session?.user
      if (sessionUser) {
        if (!isUtexasEmail(sessionUser.email)) {
          await supabase.auth.signOut()
          return NextResponse.redirect(
            `${origin}/login?error=Use a Google account containing utexas`
          )
        }
        await supabase.from('users').upsert({
          id: sessionUser.id,
          email: sessionUser.email,
        })
      }
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
