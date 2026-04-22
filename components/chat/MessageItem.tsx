'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { shortTime, absoluteTime } from '@/lib/utils/time'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { MessageWithProfile } from '@/lib/utils/groupMessages'

interface MessageItemProps {
  message: MessageWithProfile
  /** When true this is the first message in a group — show avatar + name */
  isLead: boolean
}

export function MessageItem({ message, isLead }: MessageItemProps) {
  const { user } = useSessionStore()
  const isOwn = user?.id === message.user_id
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)
  const [hovered, setHovered] = useState(false)

  async function handleEdit() {
    if (editValue.trim() === message.content) {
      setEditing(false)
      return
    }
    const supabase = createClient()
    await supabase
      .from('messages')
      .update({ content: editValue.trim(), edited_at: new Date().toISOString() })
      .eq('id', message.id)
    setEditing(false)
  }

  async function handleDelete() {
    const supabase = createClient()
    await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', message.id)
  }

  // Soft-deleted message renders as a placeholder
  if (message.deleted_at) {
    return (
      <div className={cn('px-4', isLead ? 'mt-4' : 'mt-0.5')}>
        <p className="text-xs italic text-text-faint">Message deleted.</p>
      </div>
    )
  }

  const username = message.profiles?.username ?? 'Unknown'
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4',
        isLead ? 'mt-4' : 'mt-0.5 pl-[52px]',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar — only on lead message */}
      {isLead && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent text-xs font-semibold select-none">
          {message.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.profiles.avatar_url}
              alt={username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isLead && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text">{username}</span>
            <span
              className="text-xs text-text-faint cursor-default"
              title={absoluteTime(message.created_at)}
              suppressHydrationWarning
            >
              {shortTime(message.created_at)}
            </span>
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <textarea
              className={cn(
                'w-full resize-none rounded-[var(--radius-sm)] border border-border-strong bg-bg-700',
                'px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
              rows={2}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEdit()
                }
                if (e.key === 'Escape') {
                  setEditing(false)
                  setEditValue(message.content)
                }
              }}
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleEdit} disabled={!editValue.trim()}>
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setEditValue(message.content)
                }}
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
            {message.edited_at && (
              <span className="ml-1.5 text-xs text-text-faint italic">(edited)</span>
            )}
          </p>
        )}
      </div>

      {/* Hover actions — own messages only */}
      {isOwn && !editing && hovered && (
        <div className="absolute right-4 top-0 flex items-center gap-1 rounded-[var(--radius-sm)] border border-border-strong bg-bg-800 px-1 py-0.5 shadow-md">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-text-faint hover:text-text transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-text-faint hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
