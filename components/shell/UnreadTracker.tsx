'use client'

import { useEffect, useMemo } from 'react'
import { useRoomsStore } from '@/lib/stores/rooms'
import { useUnread } from '@/lib/realtime/useUnread'

/**
 * Rendered once at the app-shell level. Subscribes to unread counts for
 * all joined rooms. Also fires `markRead` when the user navigates to a room.
 */
export function UnreadTracker() {
  const { joinedRooms, activeRoomId } = useRoomsStore()
  // Memoize so the array reference only changes when rooms actually change,
  // not on every re-render. Without this, every navigation re-triggers
  // fetchCounts because a new array reference != old one in useEffect deps.
  const joinedIds = useMemo(() => joinedRooms.map((r) => r.id), [joinedRooms])
  const { markRead } = useUnread(joinedIds)

  useEffect(() => {
    if (activeRoomId) markRead(activeRoomId)
  }, [activeRoomId, markRead])

  return null
}
