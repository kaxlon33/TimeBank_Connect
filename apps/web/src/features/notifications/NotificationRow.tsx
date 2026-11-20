import type { CSSProperties } from 'react'
import { Award, Ban, CheckCheck, CircleCheck, CircleX, Coins, Inbox, Star, type LucideIcon } from 'lucide-react'
import { relativeTime } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/types'

const icons: Record<NotificationType, LucideIcon> = {
  request_received: Inbox,
  request_accepted: CircleCheck,
  request_declined: CircleX,
  request_cancelled: Ban,
  request_marked_done: CheckCheck,
  request_completed: Coins,
  review_received: Star,
  badge_awarded: Award,
}

const tints: Record<NotificationType, string> = {
  request_received: 'bg-status-pending-bg text-status-pending',
  request_accepted: 'bg-status-accepted-bg text-status-accepted',
  request_declined: 'bg-status-declined-bg text-status-declined',
  request_cancelled: 'bg-status-cancelled-bg text-status-cancelled',
  request_marked_done: 'bg-status-awaiting-bg text-status-awaiting',
  request_completed: 'bg-status-completed-bg text-status-completed',
  review_received: 'bg-brass/25 text-brass-ink',
  badge_awarded: 'bg-brass/25 text-brass-ink',
}

interface Props {
  notification: AppNotification
  index: number
  onOpen: () => void
}

export function NotificationRow({ notification: n, index, onOpen }: Props) {
  const Icon = icons[n.type]
  const unread = !n.read_at
  return (
    <li style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'press group flex w-full items-center gap-4 rounded-2xl p-3.5 text-left transition-colors sm:px-4',
          unread ? 'bg-primary-soft/70 hover:bg-primary-soft' : 'hover:bg-muted/70',
        )}
      >
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tints[n.type])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[15px] leading-snug', unread ? 'font-bold' : 'font-semibold')}>{n.title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{n.body}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{relativeTime(n.created_at)}</span>
          {unread ? (
            <span className="size-2.5 rounded-full bg-wine-700" aria-label="Unread" />
          ) : (
            <span className="size-2.5" aria-hidden="true" />
          )}
        </span>
      </button>
    </li>
  )
}
