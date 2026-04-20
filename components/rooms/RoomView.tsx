'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Hash, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { PresenceProvider, usePresenceContext } from '@/components/presence/PresenceProvider'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/types/database'
import type { MessageWithProfile } from '@/lib/utils/groupMessages'

type Room = Database['public']['Tables']['rooms']['Row']

interface RoomViewProps {
  room: Room
  userId: string
  isMember: boolean
  initialMessages: MessageWithProfile[]
  oldestCreatedAt: string | null
}

/**
 * Inner component — lives inside PresenceProvider so hooks can call usePresenceContext()
 */
function RoomViewInner({ room, userId, isMember, initialMessages, oldestCreatedAt }: RoomViewProps) {
  const router = useRouter()
  const { user } = useSessionStore()
  const { onlineUsers } = usePresenceContext()
  const [isPending, startTransition] = useTransition()

  function handleJoin() {
    if (!user) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id })
      router.refresh()
    })
  }

  function handleLeave() {
    if (!user) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', user.id)
      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <header className="flex h-12 items-center gap-2 border-b border-border px-4 shrink-0 pr-14">
        <Hash className="h-4 w-4 text-text-faint shrink-0" />
        <span className="font-semibold text-text truncate">{room.name}</span>
        {room.description && (
          <>
            <span className="text-border-strong">|</span>
            <span className="text-sm text-text-muted truncate">{room.description}</span>
          </>
        )}
        {isMember && (
          <span className="ml-auto mr-2 shrink-0 text-xs text-text-faint">
            {onlineUsers.length} online
          </span>
        )}
        {isMember && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-text-faint hover:text-danger"
            onClick={handleLeave}
            disabled={isPending}
            title="Leave room"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </header>

      {!isMember ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-sm text-text-muted">You are not a member of this room.</p>
          <Button onClick={handleJoin} disabled={isPending}>
            {isPending ? 'Joining...' : 'Join room'}
          </Button>
        </div>
      ) : (
        <>
          <MessageList
            roomId={room.id}
            initialMessages={initialMessages}
            oldestCreatedAt={oldestCreatedAt}
          />
          <TypingIndicator typingUsers={onlineUsers} currentUserId={userId} />
          <MessageInput roomId={room.id} />
        </>
      )}
    </div>
  )
}

export function RoomView(props: RoomViewProps) {
  const { user, profile } = useSessionStore()

  // Presence requires userId/username — fall back gracefully if not yet hydrated
  const userId = props.userId
  const username = profile?.username ?? user?.email ?? userId
  const avatarUrl = profile?.avatar_url ?? null

  return (
    <PresenceProvider roomId={props.room.id} userId={userId} username={username} avatarUrl={avatarUrl}>
      <RoomViewInner {...props} />
    </PresenceProvider>
  )
}
