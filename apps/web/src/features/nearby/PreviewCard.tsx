import { Link } from 'react-router-dom'
import { ArrowUpRight, Star } from 'lucide-react'
import { formatDistance } from '@/lib/format'
import { skillImage } from '@/lib/skillImages'
import type { NearbyHelper } from '@/types'

/** The card that opens above the chosen pin: the skill, who offers it and a way to ask. */
export function PreviewCard({ helper: h }: { helper: NearbyHelper }) {
  const first = h.skills[0]
  return (
    <div className="w-[270px] overflow-hidden rounded-[22px] bg-card shadow-raised">
      <div className="relative h-24 bg-wine-800">
        {first ? <img src={skillImage(first)} alt="" width={540} height={192} className="size-full object-cover" /> : null}
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-bold">
          <Star className="size-3 fill-brass-ink text-brass-ink" aria-hidden="true" />
          {h.user.rating_avg ? h.user.rating_avg.toFixed(1) : 'New'}
          {h.user.rating_count ? <span className="font-semibold text-muted-foreground">· {h.user.rating_count}</span> : null}
        </span>
      </div>
      <div className="p-3.5">
        <p className="font-heading text-xl leading-tight font-bold tracking-[-0.03em]">{first?.title ?? 'Helper'}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {h.user.name} · {formatDistance(h.distance_km)} · Trust {Math.round(h.user.trust_score)}
        </p>
        {first ? (
          <Link
            to={`/skills/${first.id}`}
            className="press mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-wine-700 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Request
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
