import type { CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, Gift, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { formatCredits, formatDate, signedCredits } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { CreditTransaction, TransactionType } from '@/types'

const icons: Record<TransactionType, LucideIcon> = {
  starter_grant: Gift,
  session_credit: ArrowDownLeft,
  session_debit: ArrowUpRight,
  admin_adjustment: SlidersHorizontal,
}

const tints: Record<TransactionType, string> = {
  starter_grant: 'bg-brass/25 text-brass-ink',
  session_credit: 'bg-status-completed-bg text-status-completed',
  session_debit: 'bg-primary-soft text-wine-700',
  admin_adjustment: 'bg-muted text-muted-foreground',
}

function title(t: CreditTransaction) {
  if (t.type === 'starter_grant') return 'Welcome gift'
  if (t.type === 'admin_adjustment') return t.note ?? 'Adjusted by an admin'
  return t.skill_title ?? 'Session'
}

function subtitle(t: CreditTransaction) {
  const who = t.counterparty
    ? `${t.type === 'session_credit' ? 'From' : 'To'} ${t.counterparty.name}`
    : t.type === 'starter_grant'
      ? 'A starter credit for joining'
      : 'TimeBank Connect'
  return `${who} · ${formatDate(t.created_at)}`
}

export function TransactionRow({ transaction: t, index }: { transaction: CreditTransaction; index: number }) {
  const Icon = icons[t.type]
  return (
    <li
      style={{ '--delay': staggerDelay(index) } as CSSProperties}
      className="tile-in flex items-center gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/70 sm:px-4"
    >
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tints[t.type])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold">{title(t)}</p>
        <p className="truncate text-[13px] text-muted-foreground">{subtitle(t)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('numeral text-[22px]', t.amount > 0 ? 'text-status-completed' : 'text-wine-700')}>
          {signedCredits(t.amount)}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground">balance {formatCredits(t.balance_after)}</p>
      </div>
    </li>
  )
}
