import { cn } from '@/lib/utils'
import type { HelpRequest } from '@/types'
import { statusLabel, tagClass, type Box } from './status'

export function StatusTag({ request, box, className }: { request: HelpRequest; box: Box; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        tagClass[request.status],
        className,
      )}
    >
      {statusLabel(request, box)}
    </span>
  )
}
