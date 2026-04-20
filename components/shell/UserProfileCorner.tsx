'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export function UserProfileCorner() {
  const { user, profile } = useSessionStore()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? '??'
  const displayName = profile?.username ?? user?.email ?? 'Unknown'

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border">
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'bg-accent-muted text-accent text-xs font-semibold select-none',
        )}
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name */}
      <span className="flex-1 truncate text-sm font-medium text-text">{displayName}</span>

      {/* Sign out */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        title="Sign out"
        className="h-7 w-7 shrink-0 text-text-faint hover:text-danger"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
