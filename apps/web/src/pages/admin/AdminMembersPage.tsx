import { useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Search, UserCheck, UserX, Users, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { toast } from 'sonner'
import { AdminHeader } from '@/features/admin/AdminShell'
import { api, ApiError } from '@/lib/api'
import { formatCredits, formatDate, initials } from '@/lib/format'
import { staggerDelay, useAsync, useDebouncedValue } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AdminMember } from '@/types'

type Filter = 'all' | 'active' | 'suspended'

const tones = ['bg-[#efe1e4] text-[#5e1a2b]', 'bg-[#e9e2d6] text-[#5a4320]', 'bg-[#e1e4e8] text-[#2f3a4a]', 'bg-[#e4e9e2] text-[#2f4a33]']

function StatusChip({ status }: { status: AdminMember['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        status === 'active' ? 'bg-status-completed-bg text-status-completed' : 'bg-status-declined-bg text-status-declined',
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', status === 'active' ? 'bg-status-completed' : 'bg-status-declined')}
        aria-hidden="true"
      />
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
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
  const shown = useMemo(() => all.filter((m) => filter === 'all' || m.status === filter), [all, filter])
  const suspended = all.filter((m) => m.status === 'suspended').length

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
        <div role="group" aria-label="Filter by status" className="flex gap-1 self-start rounded-full bg-card p-1 shadow-card sm:self-auto">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: suspended ? `Suspended · ${suspended}` : 'Suspended' },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-10 rounded-full px-4 text-sm font-bold transition-colors',
                filter === f.value ? 'bg-wine-800 text-wine-on' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Members" className="rounded-[28px] border bg-card shadow-card">
        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_70px_70px_80px_110px_120px_130px] items-center gap-4 border-b px-6 py-3.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase lg:grid"
        >
          <span>Member</span>
          <span>Area</span>
          <span className="text-right">Sessions</span>
          <span className="text-right">Trust</span>
          <span className="text-right">Credits</span>
          <span>Joined</span>
          <span>Status</span>
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
                className="tile-in grid items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_70px_70px_80px_110px_120px_130px]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={cn('grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold', tones[m.id % tones.length])}
                  >
                    {initials(m.name)}
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
                <p className="text-sm lg:text-right">
                  <span className="mr-1.5 text-xs font-bold text-muted-foreground uppercase lg:hidden">Trust</span>
                  {Math.round(m.trust_score)}
                </p>
                <p className="text-sm font-bold lg:text-right">
                  <span className="mr-1.5 text-xs font-bold text-muted-foreground uppercase lg:hidden">Credits</span>
                  {formatCredits(m.credit_balance)} h
                </p>
                <p className="text-sm text-muted-foreground">{formatDate(m.joined_at)}</p>
                <div>
                  <StatusChip status={m.status} />
                </div>
                <div className="lg:text-right">
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
