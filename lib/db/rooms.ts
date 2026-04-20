import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Room = Database['public']['Tables']['rooms']['Row']
type RoomMember = Database['public']['Tables']['room_members']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export interface RoomWithMeta extends Room {
  member_count: number
}

export interface MemberWithProfile extends RoomMember {
  profiles: Profile | null
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  return data ?? null
}

export async function getRoomMembers(roomId: string): Promise<MemberWithProfile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('room_members')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
  return (data ?? []) as MemberWithProfile[]
}
