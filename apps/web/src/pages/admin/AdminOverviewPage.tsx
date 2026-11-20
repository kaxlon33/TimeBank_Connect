import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Coins, Flag, Gift, ShieldCheck, Users, UserX, type LucideIcon } from 'lucide-react'
import { AdminHeader } from '@/features/admin/AdminShell'
import { actionLabel, actionTone } from '@/features/admin/audit'
import { api } from '@/lib/api'
import { formatCredits, relativeTime } from '@/lib/format'
import { staggerDelay, useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AdminStats } from '@/types'

function Tile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  index,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: 'wine' | 'green' | 'brass' | 'stone'
  index: number
}) {
  const tones = {
    wine: 'bg-primary-soft text-wine-700',
    green: 'bg-status-completed-bg text-status-completed',
    brass: 'bg-brass/25 text-brass-ink',
    stone: 'bg-muted text-muted-foreground',
  }
  return (
    <div style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in rounded-[26px] border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <span className={cn('grid size-10 place-items-center rounded-xl', tones[tone])}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="numeral mt-3 text-[48px] text-foreground">{value}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{detail}</p>
    </div>
  )
}

function WeekChart({ data }: { data: AdminStats['sessions_by_week'] }) {
  const max = Math.max(...data.map((d) => d.sessions), 1)
  return (
    <div>
      <div
        role="img"
        aria-label={`Completed sessions per week: ${data.map((d) => `${d.week} ${d.sessions}`).join(', ')}`}
        className="flex h-52 items-end gap-3 sm:gap-5"
      >
        {data.map((d, i) => {
          const last = i === data.length - 1
          return (
            <div key={d.week} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
              <span className={cn('numeral text-center text-xl', last ? 'text-wine-700' : 'text-muted-foreground')}>{d.sessions}</span>
              <div
                className={cn(
                  'w-full rounded-t-2xl rounded-b-md transition-[height] duration-700 ease-out',
                  last ? 'bg-wine-700' : 'bg-wine-700/25',
                )}
                style={{ height: `${Math.max(8, (d.sessions / max) * 100)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3 sm:gap-5" aria-hidden="true">
        {data.map((d) => (
          <p key={d.week} className="min-w-0 flex-1 text-center text-xs font-semibold text-muted-foreground">
            {d.week}
          </p>
        ))}
      </div>
    </div>
  )
}

export function AdminOverviewPage() {
  const stats = useAsync(() => api.getAdminStats(), 'admin-stats')
  const moderation = useAsync(() => api.getModeration(), 'admin-moderation')

  const open = moderation.status === 'success' ? moderation.data.reported.length : 0
  const audit = moderation.status === 'success' ? moderation.data.audit.slice(0, 5) : []

  return (
    <div className="space-y-6">
      <AdminHeader
        kicker="How the time bank is doing"
        title="Overview"
        aside={
          <Link
            to="/admin/moderation"
            className={cn(
              'press flex h-11 items-center gap-2 self-start rounded-full px-4 text-sm font-bold sm:self-auto',
              open > 0 ? 'bg-status-declined-bg text-status-declined' : 'bg-status-completed-bg text-status-completed',
            )}
          >
            <Flag className="size-4" aria-hidden="true" />
            {open > 0 ? `${open} open ${open === 1 ? 'report' : 'reports'}` : 'No open reports'}
          </Link>
        }
      />

      {stats.status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-[160px] rounded-[26px]" />
          ))}
        </div>
      ) : stats.status === 'error' ? (
        <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
          <p className="font-heading text-2xl font-bold">We couldn’t load the numbers</p>
          <p className="mt-2 text-muted-foreground">{stats.error.message}</p>
          <button
            type="button"
            onClick={stats.reload}
            className="press mt-5 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              index={0}
              icon={Users}
              tone="wine"
              label="Members"
              value={String(stats.data.total_members)}
              detail={`${stats.data.active_members} active · ${stats.data.suspended_members} suspended`}
            />
            <Tile
              index={1}
              icon={ShieldCheck}
              tone="green"
              label="Sessions completed"
              value={String(stats.data.completed_sessions)}
              detail="Confirmed by both people"
            />
            <Tile
              index={2}
              icon={Coins}
              tone="brass"
              label="Credits in circulation"
              value={`${formatCredits(stats.data.credits_in_circulation)} h`}
              detail="Added up across all members"
            />
            <Tile
              index={3}
              icon={Gift}
              tone="stone"
              label="Starter credits issued"
              value={`${formatCredits(stats.data.starter_credits_issued)} h`}
              detail="Given to new members so far"
            />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section aria-labelledby="weeks-title" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
              <h2 id="weeks-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
                Sessions per week
              </h2>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">Completed sessions over the last six weeks.</p>
              <WeekChart data={stats.data.sessions_by_week} />
            </section>

            <section aria-labelledby="popular-title" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
              <h2 id="popular-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
                Most asked for
              </h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">Skills with the most requests.</p>
              <ol className="space-y-4">
                {stats.data.popular_skills.map((s, i) => {
                  const top = stats.data.popular_skills[0]?.requests || 1
                  return (
                    <li key={s.title} className="flex items-center gap-3.5">
                      <span className="numeral w-6 text-center text-2xl text-wine-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{s.title}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-wine-700" style={{ width: `${(s.requests / top) * 100}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{s.category}</p>
                      </div>
                      <span className="text-sm font-bold">{s.requests}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          </div>
        </>
      )}

      <section aria-labelledby="activity-title" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 id="activity-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
            Recent admin activity
          </h2>
          <Link to="/admin/moderation" className="group flex items-center gap-1.5 text-sm font-bold text-wine-700">
            Moderation
            <ArrowRight className="nudge size-4" aria-hidden="true" />
          </Link>
        </div>
        {moderation.status === 'loading' ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-2xl" />
            ))}
          </div>
        ) : audit.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing has been actioned yet.</p>
        ) : (
          <ul className="mt-4 divide-y">
            {audit.map((a) => {
              const tone = actionTone(a.action)
              return (
                <li key={a.id} className="flex items-start gap-3.5 py-3.5">
                  <span
                    className={cn(
                      'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
                      tone === 'bad'
                        ? 'bg-status-declined-bg text-status-declined'
                        : tone === 'good'
                          ? 'bg-status-completed-bg text-status-completed'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {a.action.startsWith('member') ? (
                      <UserX className="size-4" aria-hidden="true" />
                    ) : (
                      <Flag className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {actionLabel(a.action)} <span className="font-semibold text-muted-foreground">· {a.target}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{a.reason}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">{relativeTime(a.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
