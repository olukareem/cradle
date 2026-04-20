import { differenceInMinutes, isSameDay } from 'date-fns'
import type { Database } from '@/lib/types/database'

type MessageRow = Database['public']['Tables']['messages']['Row']

export interface MessageWithProfile extends MessageRow {
  profiles: {
    username: string
    avatar_url: string | null
  } | null
}

export interface MessageGroup {
  /** First message in the group — owns the avatar/name header */
  leadMessage: MessageWithProfile
  messages: MessageWithProfile[]
  /** True when this group's first message starts a new calendar day vs the previous group */
  showDaySeparator: boolean
}

/**
 * Fold consecutive messages from the same sender within a 2-minute window
 * into a single group. This mirrors Slack/Discord's visual rendering where
 * only the first message in a burst shows the avatar and username.
 */
export function groupMessages(messages: MessageWithProfile[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let prevGroup: MessageGroup | null = null

  for (const msg of messages) {
    const msgDate = new Date(msg.created_at)

    const sameSender = prevGroup?.leadMessage.user_id === msg.user_id
    const withinWindow =
      prevGroup !== null &&
      differenceInMinutes(msgDate, new Date(prevGroup.leadMessage.created_at)) <= 2
    const sameDay = prevGroup !== null && isSameDay(msgDate, new Date(prevGroup.leadMessage.created_at))

    if (sameSender && withinWindow) {
      prevGroup!.messages.push(msg)
    } else {
      const group: MessageGroup = {
        leadMessage: msg,
        messages: [msg],
        showDaySeparator: prevGroup === null || !sameDay,
      }
      groups.push(group)
      prevGroup = group
    }
  }

  return groups
}
