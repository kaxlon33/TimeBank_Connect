import { useState, type CSSProperties, type FormEvent } from 'react'
import { Check, Flag, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { toast } from 'sonner'
import { AdminHeader } from '@/features/admin/AdminShell'
import { actionLabel, actionTone } from '@/features/admin/audit'
import { api, ApiError } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import { staggerDelay, useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { ReportedItem, SkillCategory } from '@/types'

function CategoriesCard() {
  const cats = useAsync(() => api.getAdminCategories(), 'admin-categories')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SkillCategory['id'] | null>(null)
  const [draft, setDraft] = useState('')
  const [busyId, setBusyId] = useState<SkillCategory['id'] | null>(null)

  const list = cats.status === 'success' ? cats.data : []

  async function add(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError('Give the category a name of at least 2 letters.')
      return
    }
    setAdding(true)
    setError(null)
    try {
      const created = await api.saveCategory(null, name)
      cats.setData((prev) => [...prev, created])
      setName('')
      toast.success(`${created.name} added`)
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors.name ?? err.message) : 'We could not add that. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  async function rename(c: SkillCategory) {
    if (draft.trim().length < 2 || draft.trim() === c.name) {
      setEditing(null)
      return
    }
    setBusyId(c.id)
    try {
      const saved = await api.saveCategory(c.id, draft)
      cats.setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...saved } : x)))
      toast.success('Category renamed')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.errors.name ?? err.message) : 'We could not rename that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggle(c: SkillCategory) {
    setBusyId(c.id)
    try {
      const saved = await api.toggleCategory(c.id)
      cats.setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: saved.is_active } : x)))
      toast.success(saved.is_active ? `${c.name} is shown again` : `${c.name} is hidden from new skills`)
    } catch {
      toast.error('We could not change that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-labelledby="cats-title" className="rounded-[28px] border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <h2 id="cats-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
          Categories
        </h2>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-wine-700">{list.length}</span>
      </div>

      <form onSubmit={add} noValidate className="mt-4">
        <div className="flex gap-2">
          <label htmlFor="new-category" className="sr-only">
            New category name
          </label>
          <input
            id="new-category"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            maxLength={40}
            placeholder="New category name"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'new-category-error' : undefined}
            className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15 aria-invalid:border-negative"
          />
          <button
            type="submit"
            disabled={adding}
            className="press flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on hover:bg-wine-600 disabled:opacity-60"
          >
            {adding ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            Add
          </button>
        </div>
        {error ? (
          <p id="new-category-error" role="alert" className="mt-2 text-sm font-semibold text-negative">
            {error}
          </p>
        ) : null}
      </form>

      {cats.status === 'loading' ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-12 rounded-xl" />
          ))}
        </div>
      ) : cats.status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-muted-foreground">
          We couldn’t load the categories.{' '}
          <button type="button" onClick={cats.reload} className="font-bold text-wine-700 underline">
            Try again
          </button>
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              {editing === c.id ? (
                <>
                  <input
                    autoFocus
                    aria-label={`Rename ${c.name}`}
                    value={draft}
                    maxLength={40}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void rename(c)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    className="h-10 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm outline-none focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15"
                  />
                  <button
                    type="button"
                    aria-label="Save the new name"
                    onClick={() => void rename(c)}
                    className="press grid size-10 place-items-center rounded-xl bg-wine-700 text-wine-on"
                  >
                    {busyId === c.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="size-4" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel"
                    onClick={() => setEditing(null)}
                    className="press grid size-10 place-items-center rounded-xl border hover:bg-secondary"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <div className={cn('min-w-0 flex-1', !c.is_active && 'opacity-50')}>
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.skills_count} {c.skills_count === 1 ? 'skill' : 'skills'}
                      {c.is_active ? '' : ' · hidden'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Rename ${c.name}`}
                    onClick={() => {
                      setEditing(c.id)
                      setDraft(c.name)
                    }}
                    className="press grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.is_active}
                    aria-label={`${c.name} is ${c.is_active ? 'shown' : 'hidden'}. Switch it ${c.is_active ? 'off' : 'on'}`}
                    disabled={busyId === c.id}
                    onClick={() => void toggle(c)}
                    className={cn(
                      'press relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60',
                      c.is_active ? 'bg-wine-700' : 'bg-stone-300',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-card transition-transform duration-200',
                        c.is_active && 'translate-x-4',
                      )}
                    />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RemoveDialog({
  item,
  onClose,
  onDone,
}: {
  item: ReportedItem | null
  onClose: () => void
  onDone: (id: ReportedItem['id']) => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!item) return
    const why = (reason || item.reason).trim()
    if (why.length < 5) {
      setError('Add a short reason for the admin log.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.moderate(item.kind, item.target_id, 'remove', why)
      onDone(item.id)
      toast.success(item.kind === 'skill' ? 'Skill removed' : 'Review removed')
      setReason('')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not remove that. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root
      open={item !== null}
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
          {item ? (
            <>
              <span className="grid size-14 place-items-center rounded-2xl bg-status-declined-bg text-status-declined">
                <Trash2 className="size-7" aria-hidden="true" />
              </span>
              <Dialog.Title className="font-heading mt-4 text-2xl leading-tight font-bold tracking-[-0.03em]">
                Remove {item.kind === 'skill' ? 'this skill' : 'this review'}?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                “{item.title}” will disappear for everyone. You can restore it later from the log.
              </Dialog.Description>
              <label htmlFor="remove-reason" className="mt-5 block text-sm font-bold">
                Reason
              </label>
              <textarea
                id="remove-reason"
                value={reason}
                rows={3}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
                placeholder={item.reason}
                className="mt-2 w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
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
                  className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-negative px-6 text-sm font-bold text-white hover:bg-negative/90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                  Remove
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function AdminModerationPage() {
  const moderation = useAsync(() => api.getModeration(), 'admin-moderation')
  const [tab, setTab] = useState<'open' | 'log'>('open')
  const [removing, setRemoving] = useState<ReportedItem | null>(null)
  const [keepingId, setKeepingId] = useState<ReportedItem['id'] | null>(null)

  const reported = moderation.status === 'success' ? moderation.data.reported : []
  const audit = moderation.status === 'success' ? moderation.data.audit : []

  async function keep(item: ReportedItem) {
    setKeepingId(item.id)
    try {
      await api.dismissReport(item.id)
      moderation.reload()
      toast.success('Report closed. The content stays.')
    } catch {
      toast.error('We could not close that report. Please try again.')
    } finally {
      setKeepingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        kicker="Keep the community safe and tidy"
        title="Categories & moderation"
        aside={
          <span
            className={cn(
              'flex h-11 items-center gap-2 self-start rounded-full px-4 text-sm font-bold sm:self-auto',
              reported.length > 0 ? 'bg-status-declined-bg text-status-declined' : 'bg-status-completed-bg text-status-completed',
            )}
          >
            <Flag className="size-4" aria-hidden="true" />
            {reported.length > 0 ? `${reported.length} open ${reported.length === 1 ? 'report' : 'reports'}` : 'No open reports'}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <CategoriesCard />

        <section aria-labelledby="reports-title" className="rounded-[28px] border bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="reports-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
              Reported content
            </h2>
            <div role="group" aria-label="Show" className="flex gap-1 rounded-full bg-muted p-1">
              {(
                [
                  { value: 'open', label: 'Open', count: reported.length },
                  { value: 'log', label: 'Log', count: audit.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors',
                    tab === t.value ? 'bg-wine-800 text-wine-on shadow-card' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span className={cn('text-xs', tab === t.value ? 'text-brass' : '')}>{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          {moderation.status === 'loading' ? (
            <div className="mt-5 space-y-3" aria-busy="true">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-48 rounded-[22px]" />
              ))}
            </div>
          ) : moderation.status === 'error' ? (
            <div role="alert" className="mt-5 rounded-2xl bg-muted p-8 text-center">
              <p className="font-heading text-lg font-bold">We couldn’t load reports</p>
              <button
                type="button"
                onClick={moderation.reload}
                className="press mt-3 h-10 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                Try again
              </button>
            </div>
          ) : tab === 'open' ? (
            reported.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-muted p-10 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-status-completed-bg text-status-completed">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <p className="font-heading mt-4 text-xl font-bold">All clear</p>
                <p className="mt-1 text-sm text-muted-foreground">There is nothing waiting for a decision.</p>
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {reported.map((r, i) => (
                  <li
                    key={r.id}
                    style={{ '--delay': staggerDelay(i) } as CSSProperties}
                    className="tile-in rounded-[22px] border bg-muted/50 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-status-accepted-bg px-3 py-1 text-xs font-bold text-status-accepted">
                          {r.kind === 'skill' ? 'Skill post' : 'Review'}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-status-declined-bg px-3 py-1 text-xs font-bold text-status-declined">
                          <Flag className="size-3" aria-hidden="true" />
                          {r.reason}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {r.reports} {r.reports === 1 ? 'report' : 'reports'} · {relativeTime(r.created_at)}
                      </span>
                    </div>
                    <div className="mt-3 rounded-2xl border bg-card p-4">
                      <p className="font-heading text-lg leading-tight font-bold tracking-[-0.02em]">{r.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.excerpt}</p>
                      <p className="mt-2.5 text-[13px] font-semibold">By {r.author}</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => void keep(r)}
                        disabled={keepingId === r.id}
                        className="press flex h-11 items-center justify-center gap-2 rounded-xl border bg-card px-5 text-sm font-bold hover:bg-secondary disabled:opacity-60"
                      >
                        {keepingId === r.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Check className="size-4" aria-hidden="true" />
                        )}
                        Keep it
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(r)}
                        className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-negative px-5 text-sm font-bold text-white hover:bg-negative/90"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Remove {r.kind === 'skill' ? 'post' : 'review'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : audit.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">Nothing has been actioned yet.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {audit.map((a) => {
                const tone = actionTone(a.action)
                return (
                  <li key={a.id} className="flex items-start gap-3.5 py-3.5">
                    <span
                      className={cn(
                        'mt-1 size-2.5 shrink-0 rounded-full',
                        tone === 'bad' ? 'bg-status-declined' : tone === 'good' ? 'bg-status-completed' : 'bg-stone-300',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {actionLabel(a.action)} <span className="font-semibold text-muted-foreground">· {a.target}</span>
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{a.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.actor} · {relativeTime(a.created_at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <RemoveDialog
        item={removing}
        onClose={() => setRemoving(null)}
        onDone={() => {
          moderation.reload()
        }}
      />
    </div>
  )
}
