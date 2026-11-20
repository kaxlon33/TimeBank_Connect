import type { CreditTransaction } from '@/types'

/** A small line of how the balance moved over time, drawn from the ledger. */
export function BalanceTrend({ transactions, tone = 'dark' }: { transactions: CreditTransaction[]; tone?: 'dark' | 'light' }) {
  const colour = tone === 'dark' ? 'var(--brass-on-wine)' : 'var(--color-wine-700)'
  const points = [...transactions].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((t) => t.balance_after)
  if (points.length < 2) return null

  const w = 320
  const h = 96
  const pad = 10
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2)
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-24 w-full"
      role="img"
      aria-label={`Balance trend, now ${points[points.length - 1]} credits`}
    >
      <defs>
        <linearGradient id={`trend-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#trend-fill-${tone})`} />
      <path d={line} fill="none" stroke={colour} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === points.length - 1 ? 5 : 3.5} fill={colour} />
      ))}
    </svg>
  )
}
