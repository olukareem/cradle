'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

/**
 * Browser-side Supabase client. Safe to call from any client component.
 * `createBrowserClient` internally caches the instance per page load,
 * so repeated calls do not create new connections.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
