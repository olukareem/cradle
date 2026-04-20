'use client'

import { useState, useRef, useTransition } from 'react'
import { SendHorizonal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session'
import { usePresenceContext } from '@/components/presence/PresenceProvider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

const MAX_CHARS = 4000

interface MessageInputProps {
  roomId: string
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { user } = useSessionStore()
  const { setTyping } = usePresenceContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = value.length
  const nearLimit = charCount > MAX_CHARS * 0.8

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  function handleSend() {
    const content = value.trim()
    if (!content || !user) return
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('messages')
        .insert({ room_id: roomId, user_id: user.id, content })

      setTyping(false)
      if (error) {
        setError(error.message)
      } else {
        setValue('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 px-4 pb-4">
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div
        className={cn(
          'flex items-end gap-2 rounded-[var(--radius)] border bg-bg-800 px-3 py-2',
          'transition-colors',
          nearLimit ? 'border-warning' : 'border-border-strong focus-within:border-accent',
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text placeholder:text-text-faint
            focus:outline-none leading-relaxed max-h-[200px] overflow-y-auto"
          placeholder="Message"
          value={value}
          maxLength={MAX_CHARS}
          onChange={(e) => {
            setValue(e.target.value)
            autoResize()
            setTyping(e.target.value.length > 0)
          }}
          onBlur={() => setTyping(false)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
        />

        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          {nearLimit && (
            <span className={cn('text-xs tabular-nums', charCount >= MAX_CHARS ? 'text-danger' : 'text-warning')}>
              {MAX_CHARS - charCount}
            </span>
          )}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!value.trim() || isPending}
            className="h-7 w-7"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-text-faint">
        Enter to send, Shift+Enter for new line.
      </p>
    </div>
  )
}
