'use client'

import { useEffect } from 'react'
import { useRoomsStore } from '@/lib/stores/rooms'
import { useUnread } from '@/lib/realtime/useUnread'

/**
 * Rendered once at the app-shell level. Subscribes to unread counts for
 * all joined rooms. Also fires `markRead` when the user navigates to a room.
 */
export function UnreadTracker() {
  const { joinedRooms, activeRoomId } = useRoomsStore()
  const joinedIds = joinedRooms.map((r) => r.id)
  const { markRead } = useUnread(joinedIds)

  useEffect(() => {
    if (activeRoomId) markRead(activeRoomId)
  }, [activeRoomId, markRead])

  return null
}
