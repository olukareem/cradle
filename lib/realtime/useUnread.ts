'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRoomsStore } from '@/lib/stores/rooms'
import { useSessionStore } from '@/lib/stores/session'

/**
 * Subscribe to all joined rooms' message activity and maintain per-room
 * unread counts in Zustand. Counts are derived by comparing each room's
 * max message timestamp against the user's `last_read_at` in `room_members`.
 *
 * When the user actively views a room, call `markRead(roomId)` to reset
 * the badge and update `last_read_at` in Supabase.
 */
export function useUnread(joinedRoomIds: string[]) {
  const { user } = useSessionStore()
  const { setUnreadCount, clearUnread } = useRoomsStore()

  // Fetch initial unread counts for all joined rooms
  useEffect(() => {
    if (!user || joinedRoomIds.length === 0) return
    const supabase = createClient()

    async function fetchCounts() {
      for (const roomId of joinedRoomIds) {
        // Fetch last_read_at first, then use it as the cursor for counting newer messages
        const memberRes = await supabase
          .from('room_members')
          .select('last_read_at')
          .eq('room_id', roomId)
          .eq('user_id', user!.id)
          .single()

        const lastRead = memberRes.data?.last_read_at ?? new Date(0).toISOString()

        const msgRes = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', roomId)
          .is('deleted_at', null)
          .gt('created_at', lastRead)

        const count = msgRes.count ?? 0
        setUnreadCount(roomId, count)
      }
    }

    fetchCounts()
  }, [user, joinedRoomIds, setUnreadCount])

  // Listen for new messages across all joined rooms and bump unread counts
  useEffect(() => {
    if (!user || joinedRoomIds.length === 0) return
    const supabase = createClient()

    const channel = supabase
      .channel('unread:global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const roomId = payload.new['room_id'] as string
          if (!joinedRoomIds.includes(roomId)) return
          if (payload.new['user_id'] === user.id) return // own messages don't add unread
          setUnreadCount(roomId, (useRoomsStore.getState().unreadCounts[roomId] ?? 0) + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, joinedRoomIds, setUnreadCount])

  const markRead = useCallback(
    async (roomId: string) => {
      if (!user) return
      clearUnread(roomId)
      const supabase = createClient()
      await supabase
        .from('room_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id)
    },
    [user, clearUnread],
  )

  return { markRead }
}
