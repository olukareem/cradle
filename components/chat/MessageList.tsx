'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowDown } from 'lucide-react'
import { groupMessages, type MessageWithProfile } from '@/lib/utils/groupMessages'
import { daySeparatorLabel } from '@/lib/utils/time'
import { MessageItem } from '@/components/chat/MessageItem'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface MessageListProps {
  roomId: string
  initialMessages: MessageWithProfile[]
  /** Earliest message timestamp we've loaded (for pagination cursor) */
  oldestCreatedAt: string | null
}

const PAGE_SIZE = 50

export function MessageList({ roomId, initialMessages, oldestCreatedAt }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages)
  const [cursor, setCursor] = useState<string | null>(oldestCreatedAt)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE_SIZE)
  const [newCount, setNewCount] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Subscribe to realtime message changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`room:${roomId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the profile alongside the new message
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(username, avatar_url)')
            .eq('id', payload.new['id'])
            .single()

          if (data) {
            setMessages((prev) => {
              // Dedup: skip if we already have this id (from optimistic insert)
              if (prev.some((m) => m.id === data.id)) return prev
              return [...prev, data as MessageWithProfile]
            })
            if (!isAtBottomRef.current) {
              setNewCount((n) => n + 1)
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new['id'] ? { ...m, ...(payload.new as MessageWithProfile) } : m)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // Auto-scroll to bottom on new messages if already at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewCount(0)
    }
  }, [messages.length])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distFromBottom < 80
    if (isAtBottomRef.current) setNewCount(0)
  }, [])

  // IntersectionObserver on top sentinel → load older messages
  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loadingMore || !cursor) return
        setLoadingMore(true)

        const supabase = createClient()
        const { data } = await supabase
          .from('messages')
          .select('*, profiles(username, avatar_url)')
          .eq('room_id', roomId)
          .is('deleted_at', null)
          .lt('created_at', cursor)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (!data || data.length === 0) {
          setHasMore(false)
          setLoadingMore(false)
          return
        }

        const older = (data as MessageWithProfile[]).reverse()
        const scrollEl = scrollRef.current
        const prevHeight = scrollEl?.scrollHeight ?? 0

        setMessages((prev) => [...older, ...prev])
        setCursor(older[0]?.created_at ?? null)
        if (data.length < PAGE_SIZE) setHasMore(false)
        setLoadingMore(false)

        // Restore scroll position so adding messages above doesn't jump
        requestAnimationFrame(() => {
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight - prevHeight
          }
        })
      },
      { root: scrollRef.current, threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [roomId, cursor, hasMore, loadingMore])

  const groups = groupMessages(messages)

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto py-4"
        onScroll={handleScroll}
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1" />

        {loadingMore && (
          <p className="py-2 text-center text-xs text-text-faint">Loading...</p>
        )}

        {!hasMore && messages.length > 0 && (
          <p className="py-4 text-center text-xs text-text-faint">Beginning of conversation.</p>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <p className="text-sm text-text-muted">No messages yet. Be the first to say something.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.leadMessage.id}>
            {/* Day separator */}
            {group.showDaySeparator && (
              <div className="flex items-center gap-3 px-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span
                  className="shrink-0 text-xs font-medium text-text-faint"
                  suppressHydrationWarning
                >
                  {daySeparatorLabel(group.leadMessage.created_at)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {group.messages.map((msg, mi) => (
              <MessageItem key={msg.id} message={msg} isLead={mi === 0} />
            ))}
          </div>
        ))}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* "N new messages" scroll-to-bottom pill */}
      {newCount > 0 && (
        <Button
          size="sm"
          variant="default"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg gap-1.5"
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            setNewCount(0)
          }}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {newCount} new {newCount === 1 ? 'message' : 'messages'}
        </Button>
      )}
    </div>
  )
}
