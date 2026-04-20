'use client'

import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { useSessionStore } from '@/lib/stores/session'

type Profile = Database['public']['Tables']['profiles']['Row']

interface SessionProviderProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
}

/**
 * Hydrates the Zustand session store from server-provided data.
 * This runs once on mount so client components can read `useSessionStore()`
 * without making extra Supabase calls.
 */
export function SessionProvider({ user, profile, children }: SessionProviderProps) {
  const { setUser, setProfile } = useSessionStore()

  useEffect(() => {
    setUser(user)
    setProfile(profile)
  }, [user, profile, setUser, setProfile])

  return <>{children}</>
}
