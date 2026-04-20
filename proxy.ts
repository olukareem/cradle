import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next 16 file convention: `proxy.ts` (formerly `middleware.ts`).
 * Runs before every matched request to refresh the Supabase session
 * and enforce the auth/non-auth route boundary.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon.ico, robots.txt, sitemap.xml (metadata files)
     * - any file with an extension (images, fonts, etc.)
     *
     * API routes are intentionally INCLUDED so the proxy can refresh the
     * session cookie on data-fetching requests too.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}
