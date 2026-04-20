'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Shows a sticky banner at the top when the browser loses its network connection.
 * Uses the native `navigator.onLine` + `online`/`offline` events — no Supabase
 * dependency needed.
 */
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    function handleOffline() { setOffline(true) }
    function handleOnline() { setOffline(false) }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    setOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2
        bg-warning/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-bg-900"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      You are offline. Reconnecting...
    </div>
  )
}
