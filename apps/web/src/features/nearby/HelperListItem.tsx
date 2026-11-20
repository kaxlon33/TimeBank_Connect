import { forwardRef, type CSSProperties } from 'react'
import { Star } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { NearbyHelper } from '@/types'

interface Props {
  helper: NearbyHelper
  selected: boolean
  index: number
  onSelect: () => void
}

/** One compact line in the side panel: skill picture with the helper's face, names, rating and distance. */
export const HelperListItem = forwardRef<HTMLLIElement, Props>(function HelperListItem({ helper: h, selected, index, onSelect }, ref) {
  const first = h.skills[0]
  const distance = h.distance_km < 1 ? (h.distance_km * 1000).toFixed(0) : h.distance_km.toFixed(1)
  return (
    <li ref={ref} style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${h.user.name}, ${distance} ${h.distance_km < 1 ? 'metres' : 'kilometres'} away. Show on the map`}
        onClick={onSelect}
        className={cn(
          'press flex w-full items-center gap-3 rounded-[20px] border bg-card p-2.5 text-left transition-[border-color,box-shadow] duration-200',
          selected ? 'border-wine-700 bg-primary-soft/50 shadow-card' : 'hover:border-stone-200 hover:shadow-card',
        )}
      >
        <span className="relative size-14 shrink-0">
          <img
            src={first ? skillImage(first) : '/skills/furniture.jpg'}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            className="size-full rounded-2xl object-cover"
          />
          <span className="absolute -right-1.5 -bottom-1.5 rounded-full bg-white p-0.5 shadow-card">
            <Avatar name={h.user.name} src={h.user.avatar_url} size={26} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{h.user.name}</span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {h.skills
              .slice(0, 2)
              .map((s) => s.title)
              .join(' · ')}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold">
            <Star className="size-3 fill-brass-ink text-brass-ink" aria-hidden="true" />
            {h.user.rating_avg ? h.user.rating_avg.toFixed(1) : 'New'}
          </span>
        </span>
        <span className="pr-1.5 text-right">
          <span className="numeral block text-[30px] text-wine-700">{distance}</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">{h.distance_km < 1 ? 'm' : 'km'}</span>
        </span>
      </button>
    </li>
  )
})
