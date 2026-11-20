import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { formatDistance } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { NearbyHelper } from '@/types'

interface Props {
  helper: NearbyHelper
  selected: boolean
  index: number
  onSelect: () => void
}

export const HelperRow = forwardRef<HTMLLIElement, Props>(function HelperRow({ helper: h, selected, index, onSelect }, ref) {
  const first = h.skills[0]
  return (
    <li ref={ref} style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in">
      <div
        className={cn(
          'rounded-[22px] border bg-card p-3.5 transition-[border-color,box-shadow] duration-200',
          selected ? 'border-wine-700 shadow-card ring-1 ring-wine-700' : 'hover:border-stone-200 hover:shadow-card',
        )}
      >
        <button type="button" aria-pressed={selected} onClick={onSelect} className="press flex w-full items-center gap-3.5 text-left">
          <Avatar name={h.user.name} src={h.user.avatar_url} size={48} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">{h.user.name}</span>
            <span className="mt-0.5 flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {formatDistance(h.distance_km)}
              </span>
              {h.user.rating_avg ? (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-brass-ink text-brass-ink" aria-hidden="true" />
                  {h.user.rating_avg.toFixed(1)}
                </span>
              ) : null}
            </span>
          </span>
          <span className="text-right">
            <span className="numeral block text-[26px] text-wine-700">{Math.round(h.user.trust_score)}</span>
            <span className="block text-[10px] font-semibold text-muted-foreground">trust</span>
          </span>
        </button>

        {h.skills.length ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label={`${h.user.name} offers`}>
              {h.skills.slice(0, 2).map((s) => (
                <li key={s.id} className="max-w-full truncate rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-wine-700">
                  {s.title}
                </li>
              ))}
              {h.skills.length > 2 ? (
                <li className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">+{h.skills.length - 2}</li>
              ) : null}
            </ul>
            {first ? (
              <Link
                to={`/skills/${first.id}`}
                aria-label={`See ${first.title} by ${h.user.name}`}
                className="press grid size-9 shrink-0 place-items-center rounded-xl bg-wine-700 text-wine-on hover:bg-wine-600"
              >
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
})
