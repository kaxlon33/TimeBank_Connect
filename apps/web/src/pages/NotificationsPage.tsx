import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationRow } from '@/features/notifications/NotificationRow'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AppNotification, ID } from '@/types'

type Filter = 'all' | 'unread'

const DAY = 24 * 60 * 60 * 1000

function groupOf(n: AppNotification): 'Today' | 'This week' | 'Earlier' {
  const age = Date.now() - new Date(n.created_at).getTime()
  return age < DAY ? 'Today' : age < 7 * DAY ? 'This week' : 'Earlier'
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const feed = useAsync(() => api.getNotifications(), 'notifications')
  const [filter, setFilter] = useState<Filter>('all')
  const [marking, setMarking] = useState(false)

  const all = useMemo(
    () => (feed.status === 'success' ? [...feed.data].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []),
    [feed],
  )
  const unread = all.filter((n) => !n.read_at).length
  const shown = filter === 'unread' ? all.filter((n) => !n.read_at) : all

  const groups = (['Today', 'This week', 'Earlier'] as const)
    .map((label) => ({ label, items: shown.filter((n) => groupOf(n) === label) }))
    .filter((g) => g.items.length > 0)

  const stamp = (id: ID | null) =>
    feed.setData((prev) => prev.map((n) => (id === null || n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)))

  async function open(n: AppNotification) {
    if (!n.read_at) {
      stamp(n.id)
      void api.markNotificationRead(n.id)
    }
    navigate(n.link)
  }

  function toggleRead(n: AppNotification) {
    if (n.read_at) {
      feed.setData((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)))
      void api.markNotificationUnread(n.id)
      toast.success('Marked as unread')
    } else {
      stamp(n.id)
      void api.markNotificationRead(n.id)
      toast.success('Marked as read')
    }
  }

  async function markAll() {
    setMarking(true)
    try {
      await api.markAllNotificationsRead()
      stamp(null)
      toast.success('All caught up')
    } catch {
      toast.error('We could not update your notifications. Please try again.')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            {feed.status === 'success' ? (unread ? `${unread} new` : 'You are all caught up') : 'Checking for news'}
          </p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.2vw,3rem)] leading-[0.98] font-bold tracking-[-0.045em]">
            <span className="text-wine-700">Notifications</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={marking || unread === 0}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl border bg-card px-5 text-sm font-bold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {marking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="size-4" aria-hidden="true" />}
          Mark all as read
        </button>
      </header>

      <div role="group" aria-label="Filter notifications" className="tile-in mt-6 inline-flex gap-1 rounded-full bg-muted p-1">
        {(
          [
            { value: 'all', label: 'All' },
            { value: 'unread', label: unread ? `Unread · ${unread}` : 'Unread' },
          ] as const
        ).map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'h-9 rounded-full px-4 text-sm font-bold transition-colors',
              filter === f.value ? 'bg-wine-700 text-wine-on shadow-card' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {feed.status === 'loading' ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-[84px] rounded-2xl" />
            ))}
          </div>
        ) : feed.status === 'error' ? (
          <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
            <p className="font-heading text-2xl font-bold tracking-[-0.03em]">We couldn’t load your notifications</p>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{feed.error.message}</p>
            <button
              type="button"
              onClick={feed.reload}
              className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[28px] border bg-card p-10 text-center shadow-card sm:p-16">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
              <BellOff className="size-7" aria-hidden="true" />
            </span>
            <p className="font-heading mt-5 text-2xl font-bold tracking-[-0.03em]">
              {filter === 'unread' ? 'Nothing new' : 'No notifications yet'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {filter === 'unread'
                ? 'You have read everything. We will let you know when something happens.'
                : 'Requests, confirmations, reviews and badges will show up here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label} className="rounded-[28px] border bg-card p-2 shadow-card sm:p-3">
                <h2 className="px-3.5 pt-3 pb-2 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase sm:px-4">
                  {g.label}
                </h2>
                <ul>
                  {g.items.map((n, i) => (
                    <NotificationRow key={n.id} notification={n} index={i} onOpen={() => void open(n)} onToggleRead={() => toggleRead(n)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
