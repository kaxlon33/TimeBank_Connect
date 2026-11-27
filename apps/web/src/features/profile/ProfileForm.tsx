import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AreaAutocomplete } from '@/components/AreaAutocomplete'
import { CountrySelect } from '@/components/CountrySelect'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'
import { describedBy } from '@/lib/forms'
import type { User } from '@/types'

type Errors = Partial<Record<'name' | 'bio' | 'country' | 'area', string>>

const BIO_MAX = 200
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function hoursSummary(user: User) {
  const days = WEEK_ORDER.filter((d) => user.availability.some((s) => s.weekday === d))
  return days.length ? days.map((d) => DAYS[d]).join(', ') : 'Not set yet'
}

/** `showHours` is for members. Admins have no weekly hours, so they hide it. */
export function ProfileForm({ user, showHours = true }: { user: User; showHours?: boolean }) {
  const initial = {
    name: user.name,
    bio: user.bio,
    country: user.area?.country_code ?? '',
    area: user.area?.name ?? '',
  }
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== saved[k])
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): Errors {
    const e: Errors = {}
    if (form.name.trim().length < 2) e.name = 'Please enter your name.'
    if (form.bio.length > BIO_MAX) e.bio = `Keep it under ${BIO_MAX} characters.`
    if (!form.country) e.country = 'Choose your country.'
    if (form.area.trim().length < 2) e.area = 'Enter your town or district.'
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await api.updateProfile(
        { name: form.name.trim(), bio: form.bio.trim(), country_code: form.country, area_name: form.area.trim() },
        user.avatar_url,
      )
      setSaved(form)
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not save your profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">Your details</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Others only ever see your area, never your address.</p>

      <div className="mt-6 space-y-5">
        <Field id="profile-name" label="Full name" error={errors.name}>
          <Input
            id="profile-name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={describedBy('profile-name', errors.name)}
          />
        </Field>

        <Field
          id="profile-bio"
          label="About you"
          error={errors.bio}
          optional
          status={
            <span>
              {form.bio.length}/{BIO_MAX}
            </span>
          }
        >
          <textarea
            id="profile-bio"
            value={form.bio}
            rows={3}
            onChange={(e) => set('bio')(e.target.value)}
            placeholder="A line or two about what you enjoy helping with."
            aria-invalid={!!errors.bio || undefined}
            aria-describedby={describedBy('profile-bio', errors.bio)}
            className="w-full resize-none rounded-[14px] border border-input bg-card p-3.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-negative"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="profile-country" label="Country" error={errors.country}>
            <CountrySelect
              id="profile-country"
              value={form.country}
              onChange={set('country')}
              invalid={!!errors.country}
              describedBy={describedBy('profile-country', errors.country)}
            />
          </Field>
          <Field id="profile-area" label="Area" error={errors.area}>
            <AreaAutocomplete
              id="profile-area"
              value={form.area}
              countryCode={form.country}
              onChange={set('area')}
              invalid={!!errors.area}
              describedBy={describedBy('profile-area', errors.area)}
            />
          </Field>
        </div>
        {showHours ? (
          <Link
            to="/hours"
            className="group flex items-center gap-3.5 rounded-2xl bg-primary-soft p-3.5 transition-colors hover:bg-primary-soft/70"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-wine-700">
              <Clock className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-wine-800">Your time</span>
              <span className="block truncate text-sm text-wine-700/80">{hoursSummary(user)}</span>
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-wine-700">
              Edit
              <ArrowRight className="nudge size-4" aria-hidden="true" />
            </span>
          </Link>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={busy || !dirty}
        className="press mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wine-700 text-[15px] font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <Check className="size-[18px]" aria-hidden="true" />}
        {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
      </button>
    </form>
  )
}
