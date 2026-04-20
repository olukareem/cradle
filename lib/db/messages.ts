import { createClient } from '@/lib/supabase/server'
import type { MessageWithProfile } from '@/lib/utils/groupMessages'

const PAGE_SIZE = 50

/**
 * Load the most recent PAGE_SIZE messages for a room, newest-first,
 * then reverse so the render order is oldest-first.
 */
export async function getInitialMessages(roomId: string): Promise<MessageWithProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(username, avatar_url)')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (error || !data) return []

  // Data arrives newest-first; reverse to render oldest-first
  return (data as MessageWithProfile[]).reverse()
}

/**
 * Fetch PAGE_SIZE messages older than `before` (cursor-based pagination
 * for the infinite-scroll-up pattern).
 */
export async function getOlderMessages(
  roomId: string,
  before: string,
): Promise<MessageWithProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(username, avatar_url)')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (error || !data) return []

  return (data as MessageWithProfile[]).reverse()
}
