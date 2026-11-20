import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AuthScene } from '@/features/auth/AuthScene'
import { api, ApiError } from '@/lib/api'
import { describedBy } from '@/lib/forms'

const demo = [
  { label: 'Tom', role: 'Member', email: 'tom@timebank.test' },
  { label: 'Admin', role: 'Moderator', email: 'admin@timebank.test' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; notice?: string } | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(state?.notice ?? null)
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errs = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrs(next)
    setNotice(null)
    if (next.email || next.password) return
    setBusy(true)
    setError(null)
    try {
      const user = await api.login(email, password)
      navigate(user.role === 'admin' ? '/admin' : (state?.from ?? '/'), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const sendLink = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrs({ email: 'Enter your email first and we will send a sign-in link.' })
      document.getElementById('login-email')?.focus()
      return
    }
    setErrs({})
    setError(null)
    setNotice(`Demo only: a sign-in link would be sent to ${email}.`)
  }

  return (
    <AuthScene
      verbs={['Trade', 'Teach', 'Earn']}
      headlineLabel="Trade, teach or earn an hour. Time is the currency."
      secondLine="Time is the currency."
      intro="Help a neighbour for an hour and earn an hour of help back. Every credit is recorded, every helper is rated."
      headerLink={{ to: '/register', hint: 'New here?', label: 'Join free' }}
      cardLabelledBy="login-title"
    >
      <h2 id="login-title" className="text-3xl">
        Welcome back
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Log in to ask for help or offer your time.</p>

      <div className="mt-5">
        <p className="text-xs font-semibold text-muted-foreground">Try a demo account</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {demo.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email)
                setPassword('password')
                setErrs({})
                setError(null)
              }}
              className="press inline-flex h-11 items-center gap-2 rounded-full border border-stone-200 bg-card pr-4 pl-1.5 text-sm transition-colors hover:border-wine-600/40 hover:bg-primary-soft"
            >
              <span className="grid size-8 place-items-center rounded-full bg-wine-700 text-[0.7rem] font-bold text-wine-on">{d.label.slice(0, 2).toUpperCase()}</span>
              <span className="font-semibold">{d.label}</span>
              <span className="text-muted-foreground">{d.role}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-[12px] bg-status-declined-bg px-3 py-2.5 text-sm font-semibold text-status-declined">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 rounded-[12px] bg-primary-soft px-3 py-2.5 text-sm font-semibold text-wine-700">
          {notice}
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-5 space-y-3">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errs.email || undefined}
            aria-describedby={describedBy('login-email', errs.email)}
          />
          {errs.email ? (
            <p id="login-email-error" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
              {errs.email}
            </p>
          ) : null}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-semibold">
              Password
            </label>
            <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-wine-700 hover:underline lg:min-h-0">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
              aria-invalid={!!errs.password || undefined}
              aria-describedby={describedBy('login-password', errs.password)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {errs.password ? (
            <p id="login-password-error" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
              {errs.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="press group relative mt-2 flex h-13 w-full items-center justify-center overflow-hidden rounded-[14px] bg-wine-700 text-base font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:opacity-70"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.14),transparent)] transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden" />
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Logging in…' : 'Log in'}
          {!busy ? <ArrowRight className="nudge ml-2 size-4" aria-hidden="true" /> : null}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
      </div>
      <button
        type="button"
        onClick={sendLink}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-input text-sm font-bold transition-colors hover:bg-card"
      >
        <Mail className="size-4" aria-hidden="true" /> Email me a sign-in link
      </button>

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        We only ever show your area, never your address.
      </p>
    </AuthScene>
  )
}
