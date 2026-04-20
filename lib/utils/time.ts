import { formatDistanceToNowStrict, format, isToday, isYesterday, differenceInMinutes } from 'date-fns'

/**
 * Relative timestamp: "2 min ago", "3 hr ago", "2 days ago", etc.
 * Falls back to "just now" for sub-minute deltas.
 */
export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const minutesAgo = differenceInMinutes(new Date(), d)
  if (minutesAgo < 1) return 'just now'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

/**
 * Absolute timestamp for tooltip / hover: "Today at 2:34 PM", "Yesterday at 9:15 AM", "Apr 20, 2025"
 */
export function absoluteTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, yyyy')
}

/**
 * Short clock time for grouped message headers: "2:34 PM"
 */
export function shortTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'h:mm a')
}

/**
 * Day separator label: "Today", "Yesterday", "Monday", "April 20, 2025"
 */
export function daySeparatorLabel(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  const diffDays = differenceInMinutes(new Date(), d) / 60 / 24
  if (diffDays < 7) return format(d, 'EEEE')
  return format(d, 'MMMM d, yyyy')
}
