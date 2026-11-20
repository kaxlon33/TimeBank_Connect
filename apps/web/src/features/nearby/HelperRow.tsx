import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { formatDistance } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import type { NearbyHelper } from '@/types'

interface Props {
  helper: NearbyHelper
  closest: boolean
  index: number
  onShowOnMap: () => void
}

/** A helper as a picture card for the list view: skill photo, who they are, what they offer and two clear actions. */
export function HelperRow({ helper: h, closest, index, onShowOnMap }: Props) {
  const first = h.skills[0]
  return (
    <li style={{ '--delay': staggerDelay(index) } as CSSProperties} className="tile-in flex">
      <article className="group flex w-full flex-col overflow-hidden rounded-[28px] border bg-card shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:shadow-raised">
        <div className="relative isolate flex h-44 flex-col justify-end overflow-hidden bg-wine-800 p-4 text-white">
          {first ? (
            <img
              src={skillImage(first)}
              alt=""
              width={640}
              height={352}
              loading="lazy"
              className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/92 via-wine-900/30 to-transparent" />

          <div className="absolute top-3.5 right-3.5 left-3.5 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-brass px-3 py-1.5 text-xs font-bold text-wine-900">
                <MapPin className="size-3.5" aria-hidden="true" />
                {formatDistance(h.distance_km)}
              </span>
              {closest ? (
                <span className="rounded-full border border-white/30 bg-wine-900/45 px-3 py-1.5 text-xs font-bold backdrop-blur-md">
                  Closest
                </span>
              ) : null}
            </div>
            {h.available_now ? (
              <span className="flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-xs font-bold text-status-completed">
                <span className="size-2 rounded-full bg-status-completed" aria-hidden="true" />
                Free now
              </span>
            ) : null}
          </div>

          {first ? (
            <h3 className="font-heading line-clamp-2 text-[22px] leading-[1.05] font-bold tracking-[-0.03em] text-balance">
              {first.title}
            </h3>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-center gap-3.5">
            <span className="rounded-full ring-2 ring-primary-soft">
              <Avatar name={h.user.name} src={h.user.avatar_url} size={52} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{h.user.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                {h.user.rating_avg ? (
                  <>
                    <Star className="size-3.5 fill-brass-ink text-brass-ink" aria-hidden="true" />
                    <span className="font-bold text-foreground">{h.user.rating_avg.toFixed(1)}</span>
                    <span>
                      · {h.user.rating_count} {h.user.rating_count === 1 ? 'review' : 'reviews'}
                    </span>
                  </>
                ) : (
                  'New helper'
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="numeral text-[34px] text-wine-700">{Math.round(h.user.trust_score)}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">trust score</p>
            </div>
          </div>

          {h.skills.length > 1 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Also offers`}>
              {h.skills.slice(1, 3).map((s) => (
                <li key={s.id} className="max-w-full truncate rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-wine-700">
                  {s.title}
                </li>
              ))}
              {h.skills.length > 3 ? (
                <li className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">+{h.skills.length - 3}</li>
              ) : null}
            </ul>
          ) : null}

          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onShowOnMap}
              className="press flex h-11 items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-bold hover:bg-secondary"
            >
              <MapPin className="size-4" aria-hidden="true" />
              Show on map
            </button>
            {first ? (
              <Link
                to={`/skills/${first.id}`}
                className="press flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-wine-700 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                Request
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  )
}
