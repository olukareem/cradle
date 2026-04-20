import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

/**
 * Server-side Supabase client for RSC, Server Actions, and Route Handlers.
 *
 * In Next 16, `cookies()` is async. The `setAll` callback may run during
 * pure RSC rendering where mutating cookies throws — we swallow that error
 * because the proxy layer (`proxy.ts` at the project root) is responsible
 * for refreshing the session cookie on every request.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookie writes are not allowed
            // here. The proxy will refresh on the next request, so this is safe
            // to ignore in the rendering pass.
          }
        },
      },
    },
  )
}
