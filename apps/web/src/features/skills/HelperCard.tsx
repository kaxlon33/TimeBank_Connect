import { BadgeCheck, Heart, MapPin, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { whereLabel } from '@/lib/where'
import type { BadgeCode, User } from '@/types'

const badgeIcons: Record<BadgeCode, LucideIcon> = {
  first_exchange: Sparkles,
  helping_hand: Heart,
  community_builder: Users,
  top_rated: Star,
  reliable: ShieldCheck,
  trusted_member: BadgeCheck,
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 p-3.5">
      <p className="text-xs text-wine-on-muted">{label}</p>
      <p className="font-heading mt-1 text-2xl leading-none font-bold tracking-[-0.03em]">{value}</p>
    </div>
  )
}

export function HelperCard({ helper, distance }: { helper: User; distance: number | null }) {
  return (
    <section
      aria-label={`About ${helper.name}`}
      className="grain relative overflow-hidden rounded-[28px] bg-wine-800 p-6 text-wine-on shadow-raised"
    >
      <div aria-hidden="true" className="rings pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-4">
        <Avatar name={helper.name} size={76} className="ring-4 ring-white/15" />
        <div className="text-right">
          <p className="numeral text-[56px] text-white">{Math.round(helper.trust_score)}</p>
          <p className="mt-1 text-xs font-semibold text-wine-on-muted">trust score</p>
        </div>
      </div>

      <div className="relative mt-5">
        <h2 className="font-heading text-[28px] leading-tight font-bold tracking-[-0.03em] text-white">{helper.name}</h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-wine-on-muted">
          <MapPin className="size-4" aria-hidden="true" />
          {whereLabel(helper.area, distance)}
        </p>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2.5">
        <Stat label="Sessions" value={String(helper.completed_sessions)} />
        <Stat label="Rating" value={helper.rating_avg ? helper.rating_avg.toFixed(1) : 'New'} />
        <Stat label="Badges" value={String(helper.badges.length)} />
      </div>

      {helper.badges.length ? (
        <ul className="relative mt-5 flex flex-wrap gap-2" aria-label="Badges">
          {helper.badges.map((b) => {
            const Icon = badgeIcons[b.code] ?? Sparkles
            return (
              <li
                key={b.code}
                title={b.description}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-bold text-white"
              >
                <Icon className="size-3.5 text-brass" aria-hidden="true" />
                {b.name}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
