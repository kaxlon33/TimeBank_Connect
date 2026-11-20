import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, Camera, Check, Clock, Lock, MapPin, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { AvatarPicker } from '@/features/profile/AvatarPicker'
import { badgeIcons, BADGES } from '@/features/profile/badges'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { ReviewsList } from '@/features/skills/ReviewsList'
import { api, sessionStore } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'

const coverImages = ['/skills/bicycle-repair.jpg', '/skills/french.jpg', '/skills/spreadsheet.jpg']

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <Icon className="size-5 shrink-0 text-brass" aria-hidden="true" />
      <p className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
        <span className="numeral text-[26px] text-white">{value}</span>
        <span className="text-xs font-semibold text-wine-on-muted">{label}</span>
      </p>
    </div>
  )
}

export function ProfilePage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const mine = useAsync(() => api.getMySkills(), 'my-skills')
  const about = useAsync(() => api.getMe(), 'me')

  const earned = new Set(me.badges.map((b) => b.code))
  const earnedBadges = BADGES.filter((b) => earned.has(b.code))

  async function saveAvatar(src: string | null) {
    await api.updateProfile(
      { name: me.name, bio: me.bio, country_code: me.area?.country_code ?? '', area_name: me.area?.name ?? '' },
      src,
    )
    toast.success(src ? 'Avatar updated' : 'Back to your default avatar')
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <section
        aria-label="Your profile"
        className="tile-in relative isolate overflow-hidden rounded-[32px] bg-wine-800 text-white shadow-raised"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-20 grid grid-cols-3">
          {coverImages.map((src) => (
            <img key={src} src={src} alt="" width={960} height={720} className="size-full object-cover" />
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/95 via-wine-900/70 to-wine-900/55" />

        <div className="flex flex-col gap-8 px-5 pt-20 pb-7 sm:px-10 sm:pt-32 sm:pb-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
            <div className="relative shrink-0 self-start">
              <span className="block rounded-full bg-stone-100 p-1.5 shadow-raised">
                <Avatar name={me.name} src={me.avatar_url} size={132} className="max-sm:size-[104px]" />
              </span>
              <a
                href="#avatar-picker"
                aria-label="Change your avatar"
                className="press absolute right-0 bottom-1 grid size-12 place-items-center rounded-full bg-brass text-wine-900 shadow-raised ring-4 ring-wine-800"
              >
                <Camera className="size-5" aria-hidden="true" />
              </a>
            </div>

            <div>
              <p className="text-sm font-semibold text-wine-on-muted">Member since {formatDate(me.created_at)}</p>
              <h1 className="font-heading mt-1 text-[clamp(2.4rem,6vw,4.25rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
                {me.name}
              </h1>
              {me.area ? (
                <p className="mt-2.5 flex items-center gap-1.5 text-[15px] font-semibold text-wine-on-muted">
                  <MapPin className="size-4" aria-hidden="true" />
                  {me.area.name}, {me.area.country_name}
                </p>
              ) : null}
              {earnedBadges.length ? (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Badges you have earned">
                  {earnedBadges.map((b) => {
                    const Icon = badgeIcons[b.code]
                    return (
                      <li key={b.code} className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold backdrop-blur-md">
                        <Icon className="size-3.5 text-brass" aria-hidden="true" />
                        {b.name}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="lg:text-right">
            <p className="numeral text-[clamp(4.5rem,9vw,7.5rem)] text-white">{Math.round(me.trust_score)}</p>
            <p className="mt-2 text-sm font-semibold text-wine-on-muted">trust score</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-wine-900/55 backdrop-blur-md">
          <Stat icon={Check} label="Sessions" value={String(me.completed_sessions)} />
          <Stat icon={Star} label="Rating" value={me.rating_avg ? me.rating_avg.toFixed(1) : 'New'} />
          <Stat icon={Award} label="Badges" value={`${earnedBadges.length}/${BADGES.length}`} />
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          <section aria-labelledby="badges-title" className="grain relative overflow-hidden rounded-[28px] bg-wine-800 p-6 text-wine-on shadow-raised sm:p-8">
            <div aria-hidden="true" className="rings pointer-events-none absolute inset-0" />
            <div className="relative flex items-baseline justify-between gap-3">
              <h2 id="badges-title" className="font-heading text-2xl font-bold tracking-[-0.03em] text-white">
                Badges
              </h2>
              <p className="text-sm font-semibold text-wine-on-muted">
                {earnedBadges.length} of {BADGES.length} earned
              </p>
            </div>
            <ul className="relative mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-6">
              {BADGES.map((b) => {
                const on = earned.has(b.code)
                const Icon = badgeIcons[b.code]
                return (
                  <li key={b.code} className="flex flex-col items-center gap-2.5 text-center">
                    <span
                      className={cn(
                        'grid size-[72px] place-items-center rounded-full',
                        on ? 'bg-brass shadow-raised' : 'border-2 border-dashed border-white/25 bg-white/5',
                      )}
                    >
                      {on ? (
                        <span className="grid size-[54px] place-items-center rounded-full bg-wine-800">
                          <Icon className="size-6 text-brass" aria-hidden="true" />
                        </span>
                      ) : (
                        <Lock className="size-5 text-white/40" aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className={cn('block text-[13px] leading-tight font-bold', on ? 'text-white' : 'text-white/60')}>{b.name}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-wine-on-muted">{on ? 'Earned' : b.requirement}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <Link
            to="/hours"
            className="group flex items-center justify-between gap-4 rounded-[28px] bg-primary-soft p-6 transition-colors hover:bg-primary-soft/70 sm:px-8"
          >
            <span className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-card text-wine-700">
                <Clock className="size-6" aria-hidden="true" />
              </span>
              <span>
                <span className="font-heading block text-xl font-bold tracking-[-0.03em] text-wine-800">Your usual hours</span>
                <span className="mt-0.5 block text-sm text-wine-700/80">
                  {me.availability.length
                    ? `Free ${me.availability.length} ${me.availability.length === 1 ? 'day' : 'days'} a week`
                    : 'Not set yet'}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-wine-700">
              Edit
              <ArrowRight className="nudge size-4" aria-hidden="true" />
            </span>
          </Link>

          <section aria-labelledby="skills-title" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 id="skills-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
                Skills you offer
              </h2>
              <Link to="/my-skills" className="group flex items-center gap-1.5 text-sm font-bold text-wine-700">
                Manage
                <ArrowRight className="nudge size-4" aria-hidden="true" />
              </Link>
            </div>
            {mine.status === 'loading' ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-busy="true">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className="skeleton-shimmer h-40 rounded-[22px]" />
                ))}
              </div>
            ) : mine.status === 'success' && mine.data.length ? (
              <ul
                className="mt-5 grid gap-4 max-sm:!grid-cols-1"
                style={{ gridTemplateColumns: `repeat(${Math.min(mine.data.length, 3)}, minmax(0, 1fr))` }}
              >
                {mine.data.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/skills/${s.id}`}
                      className="group relative isolate flex h-40 flex-col justify-end overflow-hidden rounded-[22px] bg-wine-800 p-4 text-white"
                    >
                      <img
                        src={skillImage(s)}
                        alt=""
                        width={480}
                        height={360}
                        loading="lazy"
                        className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/90 to-transparent" />
                      {s.status === 'hidden' ? (
                        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-wine-700">Hidden</span>
                      ) : null}
                      <span className="font-heading text-lg leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">You haven’t posted a skill yet. Share something you’re good at.</p>
            )}
          </section>

          <section aria-labelledby="reviews-title" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-8">
            <h2 id="reviews-title" className="font-heading mb-6 text-2xl font-bold tracking-[-0.03em]">
              What neighbours say about you
            </h2>
            {about.status === 'success' ? (
              <ReviewsList helper={me} reviews={about.data.reviews} />
            ) : (
              <div className="skeleton-shimmer h-32 rounded-2xl" aria-busy="true" />
            )}
          </section>
        </div>

        <div className="space-y-6 max-lg:order-first lg:sticky lg:top-24">
          <section aria-label="Edit your profile" className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
            <AvatarPicker name={me.name} value={me.avatar_url} onSelect={saveAvatar} />
            <hr className="my-7 border-border" />
            <ProfileForm key={me.id} user={me} />
          </section>
        </div>
      </div>
    </div>
  )
}
