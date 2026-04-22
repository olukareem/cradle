'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { useRoomsStore } from '@/lib/stores/rooms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/types/database'

type Room = Database['public']['Tables']['rooms']['Row']

interface BrowseRoomsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrowseRoomsDialog({ open, onOpenChange }: BrowseRoomsDialogProps) {
  const router = useRouter()
  const { user } = useSessionStore()
  const { joinedRooms } = useRoomsStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const joinedIds = new Set(joinedRooms.map((r) => r.id))

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('rooms')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRooms(data ?? []))
  }, [open])

  const filtered = rooms.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))

  function handleJoin(room: Room) {
    if (!user) return
    setJoiningId(room.id)
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id })
      onOpenChange(false)
      router.push(`/rooms/${room.id}`)
      router.refresh()
      setJoiningId(null)
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2
            rounded-[var(--radius-lg)] border border-border-strong bg-bg-800 p-6 shadow-2xl
            animate-in fade-in-0 zoom-in-95 flex flex-col gap-4 max-h-[80vh]"
        >
          <div className="flex items-center justify-between shrink-0">
            <Dialog.Title className="text-base font-semibold text-text">Browse rooms</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-faint hover:text-text transition-colors" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Input
            placeholder="Search rooms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="shrink-0"
          />

          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-text-faint">No public rooms found.</p>
            )}
            {filtered.map((room) => {
              const already = joinedIds.has(room.id)
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5 hover:bg-bg-700 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-600">
                    <Hash className="h-4 w-4 text-text-faint" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-xs text-text-muted truncate">{room.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={already ? 'secondary' : 'default'}
                    disabled={already || (isPending && joiningId === room.id)}
                    onClick={() => !already && handleJoin(room)}
                  >
                    {already ? 'Joined' : joiningId === room.id ? 'Joining...' : 'Join'}
                  </Button>
                </div>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
