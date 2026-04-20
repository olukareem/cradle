import { Hash } from 'lucide-react'

export default function AppHomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-700">
        <Hash className="h-6 w-6 text-text-faint" />
      </div>
      <div>
        <p className="text-base font-medium text-text">Pick a room to get started</p>
        <p className="mt-1 text-sm text-text-muted">
          Browse public rooms or create your own from the sidebar.
        </p>
      </div>
    </div>
  )
}
