'use client'

import { create } from 'zustand'
import type { PresenceUser } from '@/lib/realtime/usePresence'

interface UiState {
  rightRailOpen: boolean
  toggleRightRail: () => void
  setRightRailOpen: (open: boolean) => void
  /** Live presence state — written by usePresence, read by MembersPanel */
  onlineUsers: PresenceUser[]
  setOnlineUsers: (users: PresenceUser[]) => void
}

export const useUiStore = create<UiState>((set) => ({
  rightRailOpen: true,
  toggleRightRail: () => set((s) => ({ rightRailOpen: !s.rightRailOpen })),
  setRightRailOpen: (open) => set({ rightRailOpen: open }),
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}))
