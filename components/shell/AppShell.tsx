'use client'

import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useUiStore } from '@/lib/stores/ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface AppShellProps {
  sidebar: React.ReactNode
  main: React.ReactNode
  rail: React.ReactNode
}

/**
 * Three-pane layout: fixed sidebar (280px) | flex main | collapsible right rail (240px).
 * The right rail can be toggled from the main header.
 */
export function AppShell({ sidebar, main, rail }: AppShellProps) {
  const { rightRailOpen, toggleRightRail } = useUiStore()

  return (
    <div className="flex h-screen overflow-hidden bg-bg-900">
      {/* Left sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-bg-800">
        {sidebar}
      </aside>

      {/* Main panel */}
      <div className="relative flex flex-1 flex-col min-w-0 bg-bg-900">
        {/* Rail toggle — pinned top-right of main */}
        <div className="absolute right-3 top-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightRail}
            title={rightRailOpen ? 'Hide members' : 'Show members'}
            className="h-7 w-7 text-text-faint hover:text-text"
          >
            {rightRailOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>

        {main}
      </div>

      {/* Right rail */}
      <aside
        className={cn(
          'flex flex-col border-l border-border bg-bg-800 transition-all duration-200 overflow-hidden',
          rightRailOpen ? 'w-[240px]' : 'w-0',
        )}
      >
        {rail}
      </aside>
    </div>
  )
}
