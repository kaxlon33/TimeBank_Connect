import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  status?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}

/**
 * Visible label above the control, hint and error below it. Inputs inside should set
 * aria-describedby={describedBy(id, …)} and aria-invalid when there is an error.
 */
export function Field({ id, label, hint, error, status, optional, className, children }: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
          {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
        </Label>
        {status ? <span className="text-xs">{status}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
