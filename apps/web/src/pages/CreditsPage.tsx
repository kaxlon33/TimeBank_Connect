import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Clock, ReceiptText, ShieldCheck } from 'lucide-react'
import { BalanceTrend } from '@/features/credits/BalanceTrend'
import { TransactionRow } from '@/features/credits/TransactionRow'
import { api, sessionStore } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'earned' | 'spent'

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'earned', label: 'Earned' },
  { value: 'spent', label: 'Spent' },
]

const rules = [
  { icon: Clock, text: 'One hour of help is always worth one credit.' },
  { icon: ShieldCheck, text: 'Credits move only after the person who was helped confirms the session.' },
  { icon: ReceiptText, text: 'You start with 3 credits, so you can ask for help straight away.' },
]

function Stat({ icon: Icon, label, value }: { icon: typeof ArrowDownLeft; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <Icon className="size-5 shrink-0 text-brass" aria-hidden="true" />
      <p className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
        <span className="numeral text-[26px] text-white">{value}</span>
        <span className="text-xs font-semibold text-wine-on-muted">{label}</span>
      </p>
    </div>
  )
}

export function CreditsPage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const ledger = useAsync(() => api.getTransactions(), 'transactions')
  const [filter, setFilter] = useState<Filter>('all')

  const all = useMemo(
    () => (ledger.status === 'success' ? [...ledger.data].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []),
    [ledger],
  )
  const earned = all.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const spent = all.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const shown = all.filter((t) => (filter === 'earned' ? t.amount > 0 : filter === 'spent' ? t.amount < 0 : true))

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in pt-2">
        <p className="text-sm font-semibold text-muted-foreground">Your time bank</p>
        <h1 className="font-heading mt-2 text-[clamp(2.2rem,5.2vw,3.75rem)] leading-[0.98] font-bold tracking-[-0.045em]">
          Your <span className="text-wine-700">credits</span>
        </h1>
      </header>

      <section
        aria-label="Balance"
        className="grain tile-in relative mt-7 overflow-hidden rounded-[32px] bg-wine-800 text-white shadow-raised"
        style={{ '--delay': '60ms' } as React.CSSProperties}
      >
        <div aria-hidden="true" className="rings pointer-events-none absolute inset-0" />
        <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-wine-on-muted">Available balance</p>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="numeral text-[clamp(5rem,12vw,9rem)] text-white">{formatCredits(me.credit_balance)}</span>
              <span className="font-heading text-2xl font-semibold text-wine-on-muted">
                {me.credit_balance === 1 ? 'credit' : 'credits'}
              </span>
            </p>
            <p className="mt-2 text-sm text-wine-on-muted">
              That is {formatCredits(me.credit_balance)} {me.credit_balance === 1 ? 'hour' : 'hours'} of help you can ask for.
            </p>
            <Link
              to="/"
              className="press mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-brass px-5 text-sm font-bold text-wine-900 hover:bg-brass/90"
            >
              Find help to spend them
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="hidden lg:block">
            <BalanceTrend transactions={all} />
          </div>
        </div>
        <div className="relative grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-wine-900/55 backdrop-blur-md">
          <Stat icon={ArrowDownLeft} label="Earned" value={formatCredits(earned)} />
          <Stat icon={ArrowUpRight} label="Spent" value={formatCredits(spent)} />
          <Stat icon={ReceiptText} label="Entries" value={String(all.length)} />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="history-title" className="rounded-[28px] border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 sm:px-0">
            <h2 id="history-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
              History
            </h2>
            <div role="group" aria-label="Filter history" className="flex gap-1 rounded-full bg-muted p-1">
              {filters.map((f) => (
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
          </div>

          {ledger.status === 'loading' ? (
            <div className="mt-4 space-y-2" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-[72px] rounded-2xl" />
              ))}
            </div>
          ) : ledger.status === 'error' ? (
            <div role="alert" className="mt-6 rounded-2xl bg-muted p-8 text-center">
              <p className="font-heading text-xl font-bold">We couldn’t load your history</p>
              <p className="mt-1 text-sm text-muted-foreground">{ledger.error.message}</p>
              <button
                type="button"
                onClick={ledger.reload}
                className="press mt-4 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                Try again
              </button>
            </div>
          ) : shown.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-muted p-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-wine-700">
                <ReceiptText className="size-6" aria-hidden="true" />
              </span>
              <p className="font-heading mt-4 text-xl font-bold">Nothing here yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Credits you earn and spend will show up here after your first confirmed session.
              </p>
            </div>
          ) : (
            <ul className="mt-3">
              {shown.map((t, i) => (
                <TransactionRow key={t.id} transaction={t} index={i} />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section aria-labelledby="how-title" className="rounded-[28px] bg-primary-soft p-6 sm:p-7">
            <h2 id="how-title" className="font-heading text-2xl font-bold tracking-[-0.03em] text-wine-800">
              How credits work
            </h2>
            <ul className="mt-5 space-y-4">
              {rules.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-wine-700">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="pt-1.5 text-sm leading-relaxed text-wine-800">{text}</p>
                </li>
              ))}
            </ul>
          </section>
          <Link
            to="/requests"
            className="group flex items-center justify-between gap-3 rounded-[28px] border bg-card p-5 shadow-card transition-colors hover:border-wine-700/30 sm:px-7"
          >
            <span>
              <span className="font-heading block text-lg font-bold tracking-[-0.02em]">Waiting on a confirmation?</span>
              <span className="text-sm text-muted-foreground">Check your requests</span>
            </span>
            <ArrowRight className="nudge size-5 text-wine-700" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  )
}
