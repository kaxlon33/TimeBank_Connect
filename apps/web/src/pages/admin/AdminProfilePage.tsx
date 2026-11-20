import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { AdminHeader } from '@/features/admin/AdminShell'
import { AvatarPicker } from '@/features/profile/AvatarPicker'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { api, sessionStore } from '@/lib/api'
import { formatDate } from '@/lib/format'

/** The admin's own profile: picture, name, short bio and area. The same pieces the members use. */
export function AdminProfilePage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)

  async function saveAvatar(src: string | null) {
    await api.updateProfile({ name: me.name, bio: me.bio, country_code: me.area?.country_code ?? '', area_name: me.area?.name ?? '' }, src)
    toast.success(src ? 'Picture updated' : 'Back to the default picture')
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        kicker="Your account"
        title="Your profile"
        aside={
          <Link
            to="/admin"
            className="press flex h-11 items-center gap-2 self-start rounded-full border bg-card px-4 text-sm font-bold hover:bg-secondary sm:self-auto"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Overview
          </Link>
        }
      />

      <section
        aria-label="Who you are"
        className="grain tile-in relative overflow-hidden rounded-[28px] bg-wine-800 p-6 text-white shadow-raised sm:p-8"
      >
        <div aria-hidden="true" className="rings pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="block shrink-0 self-start rounded-full bg-stone-100 p-1.5 shadow-raised">
            <Avatar name={me.name} src={me.avatar_url} size={96} />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/15 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-brass">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              ADMINISTRATOR
            </span>
            <h2 className="font-heading mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-[1.02] font-bold tracking-[-0.04em]">{me.name}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-wine-on-muted">
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" aria-hidden="true" />
                {me.email}
              </span>
              <span>Admin since {formatDate(me.created_at)}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="tile-in rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
          <AvatarPicker name={me.name} value={me.avatar_url} onSelect={saveAvatar} />
        </div>
        <div className="tile-in rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
          <ProfileForm key={me.id} user={me} showHours={false} />
        </div>
      </div>
    </div>
  )
}
