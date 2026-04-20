import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/auth']

/**
 * Refresh the Supabase session cookie on every request, then enforce the
 * auth boundary:
 *   - unauthenticated user hitting an app path → /sign-in
 *   - authenticated user hitting an auth path → /
 *
 * `getUser()` is used (not `getSession()`) because the latter trusts the
 * cookie blindly. The proxy must contact the Auth server to verify the
 * token before making a routing decision.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mirror cookies onto BOTH the upstream request (so RSC sees them on
          // this same render pass) and the outgoing response (so the browser
          // persists the refreshed session).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  return response
}
