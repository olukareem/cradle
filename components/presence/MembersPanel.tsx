'use client'

import { Users } from 'lucide-react'

/**
 * Right-rail presence panel — shows online members for the active room.
 * Wired up fully in Phase 7 (Presence).
 */
export function MembersPanel() {
  return (
    <div className="flex flex-col h-full p-3 gap-2 min-w-0">
      <div className="flex items-center gap-2 px-1 py-1">
        <Users className="h-4 w-4 shrink-0 text-text-faint" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
          Members
        </span>
      </div>
      <p className="px-1 text-xs text-text-faint">Select a room to see members.</p>
    </div>
  )
}
