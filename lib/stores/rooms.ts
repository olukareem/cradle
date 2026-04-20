'use client'

import { create } from 'zustand'
import type { Database } from '@/lib/types/database'

type Room = Database['public']['Tables']['rooms']['Row']

interface RoomsState {
  joinedRooms: Room[]
  activeRoomId: string | null
  unreadCounts: Record<string, number>
  setJoinedRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  removeRoom: (roomId: string) => void
  setActiveRoom: (roomId: string | null) => void
  setUnreadCount: (roomId: string, count: number) => void
  clearUnread: (roomId: string) => void
}

export const useRoomsStore = create<RoomsState>((set) => ({
  joinedRooms: [],
  activeRoomId: null,
  unreadCounts: {},
  setJoinedRooms: (rooms) => set({ joinedRooms: rooms }),
  addRoom: (room) => set((s) => ({ joinedRooms: [...s.joinedRooms, room] })),
  removeRoom: (roomId) =>
    set((s) => ({ joinedRooms: s.joinedRooms.filter((r) => r.id !== roomId) })),
  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),
  setUnreadCount: (roomId, count) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [roomId]: count } })),
  clearUnread: (roomId) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [roomId]: 0 } })),
}))
