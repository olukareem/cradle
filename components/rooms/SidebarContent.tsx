'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hash, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRoomsStore } from '@/lib/stores/rooms'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { CreateRoomDialog } from '@/components/rooms/CreateRoomDialog'
import type { Database } from '@/lib/types/database'

type Room = Database['public']['Tables']['rooms']['Row']

interface SidebarContentProps {
  initialRooms: Room[]
}

export function SidebarContent({ initialRooms }: SidebarContentProps) {
  const pathname = usePathname()
  const { joinedRooms, setJoinedRooms, unreadCounts } = useRoomsStore()
  const [createOpen, setCreateOpen] = useState(false)

  // Hydrate store from server-fetched data on first render
  useEffect(() => {
    setJoinedRooms(initialRooms)
  }, [initialRooms, setJoinedRooms])

  // Subscribe to room_members changes so sidebar updates in real time
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('sidebar:room_members')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members' },
        () => {
          // Refetch joined rooms when membership changes
          supabase
            .from('room_members')
            .select('rooms(*)')
            .then(({ data }) => {
              if (data) {
                const rooms = data.flatMap((m) => (m.rooms ? [m.rooms] : []))
                setJoinedRooms(rooms)
              }
            })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setJoinedRooms])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* App header */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-border shrink-0">
        <span className="font-semibold text-text">Cradle</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCreateOpen(true)}
          title="Create room"
          className="h-7 w-7 text-text-faint hover:text-text"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Rooms list */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-text-faint">
          Rooms
        </p>

        {joinedRooms.length === 0 && (
          <p className="px-2 py-1 text-xs text-text-faint">No rooms yet.</p>
        )}

        {joinedRooms.map((room) => {
          const isActive = pathname === `/rooms/${room.id}`
          const unread = unreadCounts[room.id] ?? 0
          return (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5',
                'text-sm transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-text-muted hover:bg-bg-700 hover:text-text',
              )}
            >
              <Hash className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1 truncate">{room.name}</span>
              {unread > 0 && (
                <Badge className="h-4 min-w-[1rem] px-1 text-[10px] leading-none">
                  {unread > 99 ? '99+' : unread}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
