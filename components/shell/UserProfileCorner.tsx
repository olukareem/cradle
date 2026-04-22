'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface UserProfileCornerProps {
  /** Server-rendered values passed directly from the RSC layout — no hydration flash. */
  username: string
  avatarUrl: string | null
}

export function UserProfileCorner({ username, avatarUrl }: UserProfileCornerProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border shrink-0">
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'bg-accent-muted text-accent text-xs font-semibold select-none',
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={username}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name */}
      <span className="flex-1 truncate text-sm font-medium text-text">{username}</span>

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
