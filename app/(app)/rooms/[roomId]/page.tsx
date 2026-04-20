import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getRoom } from '@/lib/db/rooms'
import { getInitialMessages } from '@/lib/db/messages'
import { RoomView } from '@/components/rooms/RoomView'

interface PageProps {
  params: Promise<{ roomId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomId } = await params
  const room = await getRoom(roomId)
  return { title: room ? `#${room.name}` : 'Room' }
}

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const room = await getRoom(roomId)
  if (!room) notFound()

  // Verify membership (RLS would block the messages query anyway, but this
  // gives us a nicer "join first" UI instead of an empty/error state)
  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle()

  const initialMessages = member ? await getInitialMessages(roomId) : []
  const oldestCreatedAt = initialMessages[0]?.created_at ?? null

  return (
    <RoomView
      room={room}
      userId={user.id}
      isMember={!!member}
      initialMessages={initialMessages}
      oldestCreatedAt={oldestCreatedAt}
    />
  )
}
