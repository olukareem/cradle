'use client'

import type { PresenceUser } from '@/lib/realtime/usePresence'

interface TypingIndicatorProps {
  typingUsers: PresenceUser[]
  currentUserId: string
}

/**
 * Renders "Alice is typing...", "Alice and Bob are typing...", or "Several people are typing..."
 * Only shown when at least one other user is actively typing.
 */
export function TypingIndicator({ typingUsers, currentUserId }: TypingIndicatorProps) {
  // typingUntil guard is handled by usePresence's 3s timer; relying solely on
  // the `typing` flag keeps render pure (no Date.now() impure call during render)
  const others = typingUsers.filter((u) => u.userId !== currentUserId && u.typing)

  if (others.length === 0) return null

  let label: string
  if (others.length === 1) {
    label = `${others[0]!.username} is typing...`
  } else if (others.length === 2) {
    label = `${others[0]!.username} and ${others[1]!.username} are typing...`
  } else {
    label = 'Several people are typing...'
  }

  return (
    <div className="px-4 pb-1 flex items-center gap-1.5 h-5">
      <TypingDots />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-faint animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  )
}
