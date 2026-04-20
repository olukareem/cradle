'use client'

import { Users } from 'lucide-react'
import { usePresenceContext } from '@/components/presence/PresenceProvider'
import { cn } from '@/lib/utils/cn'

export function MembersPanel() {
  const { onlineUsers } = usePresenceContext()

  return (
    <div className="flex flex-col h-full p-3 gap-2 min-w-0 overflow-y-auto">
      <div className="flex items-center gap-2 px-1 py-1 shrink-0">
        <Users className="h-4 w-4 shrink-0 text-text-faint" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
          Online — {onlineUsers.length}
        </span>
      </div>

      {onlineUsers.length === 0 && (
        <p className="px-1 text-xs text-text-faint">No one online right now.</p>
      )}

      {onlineUsers.map((u) => {
        const initials = u.username.slice(0, 2).toUpperCase()
        return (
          <div key={u.userId} className="flex items-center gap-2 px-1 py-1 rounded-[var(--radius-sm)] hover:bg-bg-700 transition-colors">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-muted text-accent text-xs font-semibold select-none">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.username} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-800 bg-success" />
            </div>
            <span
              className={cn(
                'text-sm truncate',
                u.typing ? 'text-accent italic' : 'text-text-muted',
              )}
            >
              {u.username}
              {u.typing && ' ...'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
