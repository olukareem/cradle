'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUiStore } from '@/lib/stores/ui'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  userId: string
  username: string
  avatarUrl: string | null
  typing: boolean
  typingUntil: number
}

const TYPING_TIMEOUT_MS = 3000

/**
 * Subscribe to Supabase Presence for a given room.
 * Returns:
 *   - `onlineUsers`: snapshot of all presence state entries
 *   - `setTyping(bool)`: call on keystroke / blur to push typing state
 */
export function usePresence(roomId: string, userId: string, username: string, avatarUrl: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function syncState(channel: RealtimeChannel) {
    const state = channel.presenceState<PresenceUser>()
    const users: PresenceUser[] = Object.values(state).flatMap((presences) => presences)
    // Deduplicate by userId — take the most recent presence per user
    const byUser = new Map<string, PresenceUser>()
    for (const u of users) byUser.set(u.userId, u)
    const deduped = Array.from(byUser.values())
    setOnlineUsers(deduped)
    // Mirror into Zustand so MembersPanel (outside PresenceProvider tree) can read it
    useUiStore.getState().setOnlineUsers(deduped)
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`room:${roomId}:presence`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => syncState(channel))
      .on('presence', { event: 'join' }, () => syncState(channel))
      .on('presence', { event: 'leave' }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            username,
            avatarUrl,
            typing: false,
            typingUntil: 0,
          } satisfies PresenceUser)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      // Clear the Zustand mirror when leaving the room
      useUiStore.getState().setOnlineUsers([])
    }
  }, [roomId, userId, username, avatarUrl])

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current
      if (!channel) return

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

      channel.track({
        userId,
        username,
        avatarUrl,
        typing: isTyping,
        typingUntil: isTyping ? Date.now() + TYPING_TIMEOUT_MS : 0,
      } satisfies PresenceUser)

      if (isTyping) {
        typingTimerRef.current = setTimeout(() => {
          channel.track({
            userId,
            username,
            avatarUrl,
            typing: false,
            typingUntil: 0,
          } satisfies PresenceUser)
        }, TYPING_TIMEOUT_MS)
      }
    },
    [userId, username, avatarUrl],
  )

  return { onlineUsers, setTyping }
}
