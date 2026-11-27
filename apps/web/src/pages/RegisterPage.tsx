import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/Field'
import { describedBy } from '@/lib/forms'
import { CountrySelect } from '@/components/CountrySelect'
import { AreaAutocomplete } from '@/components/AreaAutocomplete'
import { PasswordStrength } from '@/features/auth/PasswordStrength'
import { AuthScene } from '@/features/auth/AuthScene'
import { api, ApiError } from '@/lib/api'

type Errors = Partial<Record<'name' | 'email' | 'password' | 'country' | 'area', string>>
type EmailStatus = 'idle' | 'checking' | 'available' | 'taken'

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'GB', area: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof Errors]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (key: keyof Errors, f = form): string | undefined => {
    switch (key) {
      case 'name':
        return f.name.trim().length < 2 ? 'Enter your name.' : undefined
      case 'email':
        return /^\S+@\S+\.\S+$/.test(f.email) ? undefined : 'Enter a valid email, like name@example.com.'
      case 'password':
        return f.password.length < 8 ? 'Use at least 8 characters.' : undefined
      case 'country':
        return f.country ? undefined : 'Choose your country.'
      case 'area':
        return f.area.trim() ? undefined : 'Enter your town or district.'
    }
  }

  const blur = (key: keyof Errors) => setErrors((e) => ({ ...e, [key]: validate(key) }))

  const checkEmail = async () => {
    const err = validate('email')
    setErrors((e) => ({ ...e, email: err }))
    if (err) return setEmailStatus('idle')
    setEmailStatus('checking')
    const { available } = await api.checkEmail(form.email)
    setEmailStatus(available ? 'available' : 'taken')
    if (!available) setErrors((e) => ({ ...e, email: 'This email is already registered. Try logging in.' }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const keys: (keyof Errors)[] = ['name', 'email', 'password', 'country', 'area']
    const next: Errors = {}
    keys.forEach((k) => (next[k] = validate(k)))
    if (emailStatus === 'taken') next.email = 'This email is already registered. Try logging in.'
    setErrors(next)
    const firstError = keys.find((k) => next[k])
    if (firstError) {
      document.getElementById(firstError === 'country' ? 'country' : firstError)?.focus()
      return
    }
    setBusy(true)
    try {
      await api.register({ name: form.name, email: form.email, password: form.password, country_code: form.country, area_name: form.area })
      toast.success('Welcome to TimeBank Connect', { description: 'We added 3 starter credits to your account.' })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) setErrors((x) => ({ ...x, ...err.errors }))
    } finally {
      setBusy(false)
    }
  }

  const emailBadge =
    emailStatus === 'checking' ? (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking…
      </span>
    ) : emailStatus === 'available' ? (
      <span className="inline-flex items-center gap-1 font-semibold text-positive">
        <CheckCircle2 className="size-3.5" aria-hidden="true" /> Available
      </span>
    ) : emailStatus === 'taken' ? (
      <span className="inline-flex items-center gap-1 font-semibold text-destructive">
        <XCircle className="size-3.5" aria-hidden="true" /> Already used
      </span>
    ) : null

  return (
    <AuthScene
      verbs={['Join', 'Share', 'Earn']}
      headlineLabel="Join, share or earn an hour. Start with three hours."
      secondLine="Start with three hours."
      intro="Create your account and we add 3 starter credits, so you can ask for help straight away. Give help to earn more."
      headerLink={{ to: '/login', hint: 'Already a member?', label: 'Log in' }}
      cardLabelledBy="register-title"
      wideCard
    >
      <h2 id="register-title" className="text-3xl">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Takes a minute. We only show your area, never your address.</p>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
        <Field id="name" label="Full name" error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            onBlur={() => blur('name')}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={describedBy('name', errors.name)}
          />
        </Field>

        <Field id="email" label="Email" error={errors.email} status={<span aria-live="polite">{emailBadge}</span>}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => {
              set('email')(e.target.value)
              setEmailStatus('idle')
            }}
            onBlur={checkEmail}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={describedBy('email', errors.email)}
          />
        </Field>

        <Field id="password" label="Password" error={errors.password} className="sm:col-span-2">
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              onBlur={() => form.password && blur('password')}
              className="pr-12"
              aria-invalid={!!errors.password || undefined}
              aria-describedby={errors.password ? 'password-error' : 'password-strength'}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-[10px] text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <PasswordStrength password={form.password} id="password-strength" />
        </Field>

        <Field id="country" label="Country" error={errors.country}>
          <CountrySelect
            id="country"
            value={form.country}
            onChange={set('country')}
            invalid={!!errors.country}
            describedBy={describedBy('country', errors.country)}
          />
        </Field>
        <Field id="area" label="Area" error={errors.area} hint="The town or district you live in. Never your street address.">
          <AreaAutocomplete
            id="area"
            value={form.area}
            countryCode={form.country}
            onChange={set('area')}
            invalid={!!errors.area}
            describedBy={describedBy('area', errors.area, true)}
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="press group mt-1 flex h-13 w-full items-center justify-center rounded-[14px] bg-wine-700 text-base font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:opacity-70 sm:col-span-2"
        >
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Creating your account…' : 'Create account'}
          {!busy ? <ArrowRight className="nudge ml-2 size-4" aria-hidden="true" /> : null}
        </button>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          By joining you agree to the community guidelines.{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-wine-700 hover:underline lg:min-h-0">
            Already a member? Log in
          </Link>
        </p>
      </form>
    </AuthScene>
  )
}
