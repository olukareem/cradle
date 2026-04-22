import * as React from 'react'
import { cn } from '@/lib/utils/cn'

// Using a type alias avoids the "no-empty-object-type" lint error while keeping
// the same public API for consumers.
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-[var(--radius)] border border-border-strong bg-bg-800 px-3 py-1',
          'text-sm text-text placeholder:text-text-faint',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
