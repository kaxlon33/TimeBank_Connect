import { useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Search, UserCheck, UserX, Users, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { AdminHeader } from '@/features/admin/AdminShell'
import { api, ApiError } from '@/lib/api'
import { formatCredits, relativeTime } from '@/lib/format'
import { staggerDelay, useAsync, useDebouncedValue } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AdminMember } from '@/types'

type Presence = 'active' | 'inactive' | 'suspended'
type Filter = 'all' | Presence

/** Quiet for this many days or more counts as inactive. */
const INACTIVE_AFTER_DAYS = 30

function presenceOf(m: AdminMember): Presence {
  if (m.status === 'suspended') return 'suspended'
  const days = (Date.now() - new Date(m.last_active_at).getTime()) / (24 * 60 * 60 * 1000)
  return days >= INACTIVE_AFTER_DAYS ? 'inactive' : 'active'
}

const presenceLabel: Record<Presence, string> = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended' }
const dotColour: Record<Presence, string> = { active: 'bg-emerald-500', inactive: 'bg-red-500', suspended: 'bg-stone-400' }

/** A small round light: green for active, red for inactive, grey for suspended. */
function Dot({ presence, className }: { presence: Presence; className?: string }) {
  return (
    <span
      role="img"
      aria-label={presenceLabel[presence]}
      title={presenceLabel[presence]}
      className={cn('block rounded-full', dotColour[presence], className)}
    />
  )
}

function ActionDialog({
  member,
  onClose,
  onDone,
}: {
  member: AdminMember | null
  onClose: () => void
  onDone: (id: AdminMember['id'], status: AdminMember['status'], reason: string | null) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const suspending = member?.status === 'active'

  async function confirm() {
    if (!member) return
    if (suspending && reason.trim().length < 10) {
      setError('Write at least 10 characters so the reason is clear in the log.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = suspending ? 'suspended' : 'active'
      const why = suspending ? reason.trim() : null
      await api.setMemberStatus(member.id, next, why)
      onDone(member.id, next, why)
      toast.success(suspending ? `${member.name} is suspended` : `${member.name} is active again`)
      setReason('')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not update this member. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReason('')
          setError(null)
          onClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-wine-900/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[32px] bg-popover p-6 shadow-raised outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px] sm:p-8">
          <Dialog.Close
            aria-label="Close"
            className="press absolute top-4 right-4 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </Dialog.Close>
          {member ? (
            <>
              <span
                className={cn(
                  'grid size-14 place-items-center rounded-2xl',
                  suspending ? 'bg-status-declined-bg text-status-declined' : 'bg-status-completed-bg text-status-completed',
                )}
              >
                {suspending ? <UserX className="size-7" aria-hidden="true" /> : <UserCheck className="size-7" aria-hidden="true" />}
              </span>
              <Dialog.Title className="font-heading mt-4 text-2xl leading-tight font-bold tracking-[-0.03em]">
                {suspending ? `Suspend ${member.name}?` : `Reactivate ${member.name}?`}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                {suspending
                  ? 'They will be logged out and cannot use the app until you reactivate them. Their skills stay saved.'
                  : 'They will be able to log in and use the app again.'}
              </Dialog.Description>

              {suspending ? (
                <div className="mt-5">
                  <label htmlFor="suspend-reason" className="text-sm font-bold">
                    Reason
                  </label>
                  <textarea
                    id="suspend-reason"
                    value={reason}
                    rows={3}
                    onChange={(e) => {
                      setReason(e.target.value)
                      setError(null)
                    }}
                    placeholder="What happened? This goes in the admin log."
                    aria-invalid={!!error || undefined}
                    className="mt-2 w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-negative"
                  />
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="mt-3 text-sm font-semibold text-negative">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close className="press h-12 rounded-2xl border bg-card px-5 text-sm font-bold hover:bg-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className={cn(
                    'press flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white disabled:opacity-60',
                    suspending ? 'bg-negative hover:bg-negative/90' : 'bg-status-completed hover:bg-status-completed/90',
                  )}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {suspending ? 'Suspend member' : 'Reactivate member'}
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function AdminMembersPage() {
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [target, setTarget] = useState<AdminMember | null>(null)
  const query = useDebouncedValue(text.trim(), 300)
  const members = useAsync((signal) => api.getAdminMembers(query, signal), `members|${query}`)

  const all = useMemo(() => (members.status === 'success' ? members.data : []), [members])
  const shown = useMemo(() => all.filter((m) => filter === 'all' || presenceOf(m) === filter), [all, filter])
  const count = (p: Presence) => all.filter((m) => presenceOf(m) === p).length

  const apply = (id: AdminMember['id'], status: AdminMember['status'], reason: string | null) =>
    members.setData((prev) => prev.map((m) => (m.id === id ? { ...m, status, suspended_reason: reason } : m)))

  return (
    <div className="space-y-6">
      <AdminHeader kicker="Everyone who has joined" title="Members" />

      <div
        className="tile-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ '--delay': '60ms' } as CSSProperties}
      >
        <div className="relative sm:w-[360px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="member-search" className="sr-only">
            Search members by name, email or area
          </label>
          <input
            id="member-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search name, email or area…"
            autoComplete="off"
            className="h-12 w-full rounded-2xl border bg-card pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <div
          role="group"
          aria-label="Filter by status"
          className="flex w-full max-w-full justify-between gap-0.5 overflow-x-auto rounded-full bg-card p-1 shadow-card [scrollbar-width:none] sm:w-auto sm:justify-start sm:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          {(
            [
              { value: 'all', label: 'All', dot: null },
              { value: 'active', label: 'Active', dot: 'active' },
              { value: 'inactive', label: 'Inactive', dot: 'inactive' },
              { value: 'suspended', label: 'Suspended', dot: 'suspended' },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-colors sm:gap-2 sm:px-4 sm:text-sm',
                filter === f.value ? 'bg-wine-800 text-wine-on' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.dot ? <span className={cn('size-2.5 rounded-full', dotColour[f.dot])} aria-hidden="true" /> : null}
              {f.label}
              {f.dot && count(f.dot) > 0 ? <span className="text-xs opacity-70 max-sm:hidden">{count(f.dot)}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Members" className="rounded-[28px] border bg-card shadow-card">
        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_80px_130px_130px] items-center gap-4 border-b px-6 py-3.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase lg:grid"
        >
          <span>Member</span>
          <span>Area</span>
          <span className="text-right">Sessions</span>
          <span className="text-right">Credits</span>
          <span>Last active</span>
          <span />
        </div>

        {members.status === 'loading' ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : members.status === 'error' ? (
          <div role="alert" className="p-10 text-center">
            <p className="font-heading text-xl font-bold">We couldn’t load members</p>
            <p className="mt-1 text-sm text-muted-foreground">{members.error.message}</p>
            <button
              type="button"
              onClick={members.reload}
              className="press mt-4 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Try again
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-wine-700">
              <Users className="size-6" aria-hidden="true" />
            </span>
            <p className="font-heading mt-4 text-xl font-bold">No members found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {shown.map((m, i) => (
              <li
                key={m.id}
                style={{ '--delay': staggerDelay(i) } as CSSProperties}
                className="tile-in grid grid-cols-2 items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_80px_130px_130px]"
              >
                <div className="col-span-2 flex min-w-0 items-center gap-3.5 lg:col-span-1">
                  <span className="relative shrink-0">
                    <Avatar name={m.name} src={m.avatar_url} size={46} />
                    <Dot presence={presenceOf(m)} className="absolute right-0 bottom-0 size-3.5 ring-2 ring-card" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{m.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{m.email}</p>
                    {m.status === 'suspended' && m.suspended_reason ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-status-declined">{m.suspended_reason}</p>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground lg:text-foreground">
                  <span className="mr-1.5 text-xs font-bold tracking-wide uppercase lg:hidden">Area</span>
                  {m.area ? `${m.area.name}` : '—'}
                </p>
                <p className="text-sm lg:text-right">
                  <span className="mr-1.5 text-xs font-bold text-muted-foreground uppercase lg:hidden">Sessions</span>
                  {m.completed_sessions}
                </p>
                <p className="text-sm font-bold lg:text-right">
                  <span className="mr-1.5 text-xs font-bold text-muted-foreground uppercase lg:hidden">Credits</span>
                  {formatCredits(m.credit_balance)} h
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="mr-1.5 text-xs font-bold text-muted-foreground uppercase lg:hidden">Last active</span>
                  {relativeTime(m.last_active_at)}
                </p>
                <div className="col-span-2 lg:col-span-1 lg:text-right">
                  <button
                    type="button"
                    onClick={() => setTarget(m)}
                    className={cn(
                      'press inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-bold',
                      m.status === 'active'
                        ? 'text-negative hover:bg-status-declined-bg'
                        : 'text-status-completed hover:bg-status-completed-bg',
                    )}
                  >
                    {m.status === 'active' ? (
                      <UserX className="size-4" aria-hidden="true" />
                    ) : (
                      <UserCheck className="size-4" aria-hidden="true" />
                    )}
                    {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActionDialog member={target} onClose={() => setTarget(null)} onDone={apply} />
    </div>
  )
}
