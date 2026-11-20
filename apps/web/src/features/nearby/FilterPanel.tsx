import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NEARBY_CHIPS } from './filters'

export const RADII = [1, 3, 5, 10] as const
export type Radius = (typeof RADII)[number]

interface Props {
  text: string
  onText: (v: string) => void
  radius: Radius
  onRadius: (r: Radius) => void
  chip: string | null
  onChip: (id: string | null) => void
  availableNow: boolean
  onAvailableNow: (v: boolean) => void
}

/** Search, distance, category chips and the "available now" switch. */
export function FilterPanel({ text, onText, radius, onRadius, chip, onChip, availableNow, onAvailableNow }: Props) {
  return (
    <section aria-label="Filter helpers" className="rounded-[24px] bg-card/95 p-4 shadow-raised backdrop-blur-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="nearby-search" className="sr-only">
          Search a skill or a helper
        </label>
        <input
          id="nearby-search"
          type="search"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Search a skill…"
          autoComplete="off"
          className="h-11 w-full rounded-2xl border bg-muted/60 pr-9 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onText('')}
            className="press absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-bold text-muted-foreground">Distance</p>
      <div role="radiogroup" aria-label="Search distance" className="mt-2 flex gap-0.5 rounded-full border bg-muted/50 p-1">
        {RADII.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={radius === r}
            onClick={() => onRadius(r)}
            className={cn(
              'h-8 flex-1 rounded-full px-2 text-xs font-bold transition-colors',
              radius === r ? 'bg-wine-800 text-wine-on shadow-card' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r} km
          </button>
        ))}
      </div>

      <div role="group" aria-label="Skill type" className="mt-3.5 flex flex-wrap gap-2">
        {NEARBY_CHIPS.map((c) => {
          const on = chip === c.id
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChip(on ? null : c.id)}
              className={cn(
                'press h-8 rounded-full border px-3.5 text-xs font-bold transition-colors',
                on ? 'border-wine-700 bg-primary-soft text-wine-700' : 'bg-card text-foreground hover:border-stone-200',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span id="available-now-label" className="text-sm font-bold">
          Available now
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={availableNow}
          aria-labelledby="available-now-label"
          onClick={() => onAvailableNow(!availableNow)}
          className={cn(
            'press relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
            availableNow ? 'bg-wine-700' : 'bg-stone-300',
          )}
        >
          <span
            className={cn(
              'absolute top-1 left-1 size-5 rounded-full bg-white shadow-card transition-transform duration-200',
              availableNow && 'translate-x-5',
            )}
          />
        </button>
      </div>
    </section>
  )
}
