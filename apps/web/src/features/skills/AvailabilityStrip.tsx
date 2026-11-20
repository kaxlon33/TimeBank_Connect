import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/types'

// Monday first. The data uses 0 = Sunday.
const order = [1, 2, 3, 4, 5, 6, 0] as const
const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** A week at a glance: free days are tinted and show their hours. */
export function AvailabilityStrip({ slots }: { slots: AvailabilitySlot[] }) {
  return (
    <ul className="grid grid-cols-7 gap-1.5 sm:gap-2.5" aria-label="Usual weekly availability">
      {order.map((day) => {
        const today = slots.filter((s) => s.weekday === day)
        const free = today.length > 0
        return (
          <li
            key={day}
            className={cn(
              'flex min-h-[92px] flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition-colors sm:min-h-[104px] sm:py-4',
              free ? 'border-wine-700/15 bg-primary-soft' : 'border-transparent bg-muted',
            )}
          >
            <span
              className={cn('text-[11px] font-bold tracking-[0.08em] uppercase', free ? 'text-wine-700' : 'text-muted-foreground')}
            >
              {short[day]}
            </span>
            {free ? (
              today.map((s) => (
                <span key={s.start_time} className="flex flex-col leading-tight">
                  <span className="font-heading text-[15px] font-bold tracking-[-0.02em] sm:text-lg">{s.start_time}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground sm:text-xs">to {s.end_time}</span>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground/60" aria-label="Not available">
                —
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
