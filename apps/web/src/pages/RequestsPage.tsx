import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { RequestDetail } from '@/features/requests/RequestDetail'
import { RequestRow } from '@/features/requests/RequestRow'
import { ReviewDialog } from '@/features/requests/ReviewDialog'
import { actionMessages, groupMeta, groupOf, otherParty, type Action, type Box, type Group } from '@/features/requests/status'
import { api, ApiError, sessionStore } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { HelpRequest } from '@/types'

const GROUPS: Group[] = ['needs', 'progress', 'done']

const needsCount = (list: HelpRequest[] | undefined, box: Box) =>
  list ? list.filter((r) => groupOf(r, box) === 'needs').length : 0

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading requests">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton-shimmer h-[92px] rounded-[22px]" />
      ))}
    </div>
  )
}

export function RequestsPage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const [box, setBox] = useState<Box>('received')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<number | null>(null)

  const received = useAsync(() => api.getRequests('received'), 'received')
  const sent = useAsync(() => api.getRequests('sent'), 'sent')
  const current = box === 'received' ? received : sent
  const list = current.status === 'success' ? current.data : []

  const selected =
    list.find((r) => r.id === selectedId) ?? list.find((r) => groupOf(r, box) === 'needs') ?? list[0] ?? null
  const reviewTarget =
    reviewId === null
      ? null
      : [...(received.data ?? []), ...(sent.data ?? [])].find((r) => r.id === reviewId) ?? null

  const waiting =
    needsCount(received.data, 'received') + needsCount(sent.data, 'sent')

  function patch(updated: HelpRequest) {
    const swap = (l: HelpRequest[]) => l.map((x) => (x.id === updated.id ? updated : x))
    received.setData(swap)
    sent.setData(swap)
  }

  async function act(r: HelpRequest, action: Action) {
    setBusy(action)
    setError(null)
    try {
      const updated = action === 'confirm' ? await api.confirmRequest(r.id) : await api.respondToRequest(r.id, action)
      patch(updated)
      toast.success(actionMessages[action])
      if (action === 'confirm') setReviewId(updated.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function submitReview(rating: number, comment: string) {
    if (!reviewTarget) return
    await api.submitReview(reviewTarget.id, rating, comment)
    patch({ ...reviewTarget, reviewed_by_me: true })
    toast.success('Thanks for your review')
  }

  const switchBox = (next: Box) => {
    setBox(next)
    setSelectedId(null)
    setMobileOpen(false)
    setError(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-wine-700" aria-live="polite">
            {received.status === 'success' && sent.status === 'success'
              ? waiting
                ? `${waiting} ${waiting === 1 ? 'exchange needs' : 'exchanges need'} you today`
                : 'You are all caught up'
              : 'Your exchanges'}
          </p>
          <h1 className="font-heading mt-1.5 text-[clamp(2.4rem,5.2vw,4rem)] leading-[0.98] font-bold tracking-[-0.045em]">Requests</h1>
        </div>

        <div role="group" aria-label="Request box" className="relative grid h-14 w-full grid-cols-2 rounded-full border bg-card p-1.5 sm:w-72">
          <span
            aria-hidden="true"
            className="seg-thumb absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-full bg-wine-800"
            style={{ '--seg-index': box === 'received' ? 0 : 1 } as CSSProperties}
          />
          {(['received', 'sent'] as const).map((b) => {
            const count = needsCount(b === 'received' ? received.data : sent.data, b)
            const on = box === b
            return (
              <button
                key={b}
                type="button"
                aria-pressed={on}
                onClick={() => switchBox(b)}
                className={cn(
                  'relative flex items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors duration-200',
                  on ? 'text-wine-on' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {b === 'received' ? 'Received' : 'Sent'}
                {count ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1.5 text-[11px] font-bold text-wine-900">
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Requests list" className={cn(mobileOpen && 'hidden lg:block')}>
          {current.status === 'loading' ? (
            <ListSkeleton />
          ) : current.status === 'error' ? (
            <div role="alert" className="rounded-[28px] border bg-card p-8 text-center">
              <p className="font-heading text-2xl font-bold tracking-[-0.03em]">We couldn’t load requests</p>
              <p className="mt-2 text-sm text-muted-foreground">{current.error.message}</p>
              <button
                type="button"
                onClick={current.reload}
                className="press mt-5 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                Try again
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-[28px] border bg-card p-10 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
                <Inbox className="size-7" aria-hidden="true" />
              </span>
              <p className="font-heading mt-5 text-2xl font-bold tracking-[-0.03em]">
                {box === 'received' ? 'No requests yet' : 'You haven’t asked for help yet'}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                {box === 'received'
                  ? 'When a neighbour asks for one of your skills, it appears here.'
                  : 'Find a skill you need and send your first request.'}
              </p>
              <Link
                to={box === 'received' ? '/my-skills' : '/'}
                className="press mt-6 inline-flex h-12 items-center rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                {box === 'received' ? 'Post a skill' : 'Browse skills'}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {GROUPS.map((g) => {
                const rows = list.filter((r) => groupOf(r, box) === g)
                if (!rows.length) return null
                return (
                  <div key={g} role="group" aria-label={groupMeta[g].label}>
                    <p className="mb-2.5 flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                      <span aria-hidden="true" className={cn('size-2 rounded-full', groupMeta[g].dot)} />
                      {groupMeta[g].label}
                      <span className="font-semibold">{rows.length}</span>
                    </p>
                    <div className="space-y-2.5">
                      {rows.map((r, i) => (
                        <RequestRow
                          key={r.id}
                          request={r}
                          box={box}
                          index={i}
                          selected={selected?.id === r.id}
                          onSelect={() => {
                            setSelectedId(r.id)
                            setMobileOpen(true)
                            setError(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className={cn('lg:sticky lg:top-24', !mobileOpen && 'hidden lg:block')}>
          {selected ? (
            <RequestDetail
              key={selected.id}
              request={selected}
              box={box}
              balance={me.credit_balance}
              busy={busy}
              error={error}
              onAction={(a) => act(selected, a)}
              onReview={() => setReviewId(selected.id)}
              onBack={() => setMobileOpen(false)}
            />
          ) : null}
        </div>
      </div>

      {reviewTarget ? (
        <ReviewDialog
          open
          onOpenChange={(open) => !open && setReviewId(null)}
          name={otherParty(reviewTarget, reviewTarget.requester.id === me.id ? 'sent' : 'received').name}
          skillTitle={reviewTarget.skill.title}
          onSubmit={submitReview}
        />
      ) : null}
    </div>
  )
}
