'use client'

import { create } from 'zustand'

interface UiState {
  rightRailOpen: boolean
  toggleRightRail: () => void
  setRightRailOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  rightRailOpen: true,
  toggleRightRail: () => set((s) => ({ rightRailOpen: !s.rightRailOpen })),
  setRightRailOpen: (open) => set({ rightRailOpen: open }),
}))
