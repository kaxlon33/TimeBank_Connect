import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { formatDistance } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { NearbyHelper } from '@/types'

interface Props {
  helper: NearbyHelper
  selected: boolean
  closest: boolean
  index: number
  onSelect: () => void
}

/** A helper as a picture card: their first skill on top, then who they are and how far away. */
export const HelperRow = forwardRef<HTMLLIElement, Props>(function HelperRow({ helper: h, selected, closest, index, onSelect }, ref) {
  const first = h.skills[0]
  return (
    <li ref={ref} style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in">
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border bg-card transition-[border-color,box-shadow] duration-200',
          selected ? 'border-wine-700 shadow-raised ring-1 ring-wine-700' : 'shadow-card hover:border-stone-200 hover:shadow-raised',
        )}
      >
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          aria-label={`Show ${h.user.name} on the map`}
          className="press block w-full text-left"
        >
          <span className="relative isolate flex h-24 flex-col justify-end overflow-hidden bg-wine-800 p-3.5 text-white">
            {first ? (
              <img
                src={skillImage(first)}
                alt=""
                width={480}
                height={200}
                loading="lazy"
                className="absolute inset-0 -z-20 size-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/90 via-wine-900/35 to-transparent" />
            <span className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-brass px-2.5 py-1 text-[11px] font-bold text-wine-900">
                <MapPin className="size-3" aria-hidden="true" />
                {formatDistance(h.distance_km)}
              </span>
              {closest ? (
                <span className="rounded-full border border-white/30 bg-wine-900/45 px-2.5 py-1 text-[11px] font-bold backdrop-blur-md">
                  Closest
                </span>
              ) : null}
            </span>
            {first ? (
              <span className="font-heading line-clamp-1 text-lg leading-tight font-bold tracking-[-0.02em]">{first.title}</span>
            ) : null}
            {h.skills.length > 1 ? (
              <span className="absolute top-3 right-3 rounded-full border border-white/30 bg-wine-900/45 px-2.5 py-1 text-[11px] font-bold backdrop-blur-md">
                +{h.skills.length - 1} more
              </span>
            ) : null}
          </span>

          <span className="flex items-center gap-3.5 p-3.5">
            <Avatar name={h.user.name} src={h.user.avatar_url} size={46} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">{h.user.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                {h.user.rating_avg ? (
                  <>
                    <Star className="size-3.5 fill-brass-ink text-brass-ink" aria-hidden="true" />
                    {h.user.rating_avg.toFixed(1)} · {h.user.rating_count} reviews
                  </>
                ) : (
                  'New helper'
                )}
              </span>
            </span>
            <span className="text-right">
              <span className="numeral block text-[28px] text-wine-700">{Math.round(h.user.trust_score)}</span>
              <span className="block text-[10px] font-semibold text-muted-foreground">trust</span>
            </span>
          </span>
        </button>

        {first ? (
          <Link
            to={`/skills/${first.id}`}
            className="press flex h-11 items-center justify-center gap-1.5 border-t bg-muted/60 text-sm font-bold text-wine-700 hover:bg-primary-soft"
          >
            View {first.title.length > 26 ? 'skill' : first.title}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </li>
  )
})
