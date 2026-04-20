'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const router = useRouter()
  const { user } = useSessionStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // Create the room
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({ name: name.trim(), description: description.trim() || null, is_private: isPrivate, created_by: user.id })
        .select()
        .single()

      if (roomErr || !room) {
        setError(roomErr?.message ?? 'Failed to create room')
        return
      }

      // Auto-join as owner
      const { error: memberErr } = await supabase
        .from('room_members')
        .insert({ room_id: room.id, user_id: user.id, role: 'owner' })

      if (memberErr) {
        setError(memberErr.message)
        return
      }

      onOpenChange(false)
      setName('')
      setDescription('')
      router.push(`/rooms/${room.id}`)
      router.refresh()
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2
            rounded-[var(--radius-lg)] border border-border-strong bg-bg-800 p-6 shadow-2xl
            animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-text">Create a room</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-faint hover:text-text transition-colors" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-name">Room name</Label>
              <Input
                id="room-name"
                required
                minLength={1}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="general"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-desc">Description (optional)</Label>
              <Input
                id="room-desc"
                maxLength={280}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this room about?"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-accent"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private room
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2 justify-end mt-1">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
