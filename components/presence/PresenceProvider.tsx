'use client'

import { createContext, useContext } from 'react'
import { usePresence, type PresenceUser } from '@/lib/realtime/usePresence'

interface PresenceContextValue {
  onlineUsers: PresenceUser[]
  setTyping: (typing: boolean) => void
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUsers: [],
  setTyping: () => {},
})

interface PresenceProviderProps {
  roomId: string
  userId: string
  username: string
  avatarUrl: string | null
  children: React.ReactNode
}

export function PresenceProvider({
  roomId,
  userId,
  username,
  avatarUrl,
  children,
}: PresenceProviderProps) {
  const { onlineUsers, setTyping } = usePresence(roomId, userId, username, avatarUrl)

  return (
    <PresenceContext.Provider value={{ onlineUsers, setTyping }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresenceContext() {
  return useContext(PresenceContext)
}
