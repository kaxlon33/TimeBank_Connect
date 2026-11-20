import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AuthScene } from '@/features/auth/AuthScene'
import { api, ApiError, DEMO_RESET_TOKEN } from '@/lib/api'
import { describedBy } from '@/lib/forms'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter the email you signed up with.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await api.requestPasswordReset(email)
      setSentTo(res.email)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScene
      verbs={['Gain', 'Earn', 'Save']}
      headlineLabel="Forgot your password? We will help you back in."
      secondLine="We will help you back in."
      intro="Enter your email and we will send you a link to choose a new password."
      headerLink={{ to: '/login', hint: 'Remembered it?', label: 'Log in' }}
      cardLabelledBy="forgot-title"
    >
      {sentTo ? (
        <div role="status">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-wine-700">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <h2 id="forgot-title" className="mt-4 text-3xl">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for <span className="font-bold text-foreground">{sentTo}</span>, we have sent a link to choose a new password. It works for one hour.
          </p>

          <div className="mt-5 rounded-2xl bg-primary-soft p-4">
            <p className="text-xs font-bold tracking-[0.08em] text-wine-700 uppercase">Demo only</p>
            <p className="mt-1 text-sm text-wine-800">No email is sent in this demo. Use this button instead of the link in the email.</p>
            <Link
              to={`/reset-password?token=${DEMO_RESET_TOKEN}&email=${encodeURIComponent(sentTo)}`}
              className="press mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Open the reset link
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="mt-5 text-sm font-semibold text-wine-700 hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <h2 id="forgot-title" className="text-3xl">
            Forgot your password?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">No problem. We will email you a link to reset it.</p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-semibold">
                Email
              </label>
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error || undefined}
                aria-describedby={describedBy('forgot-email', error)}
              />
              {error ? (
                <p id="forgot-email-error" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="press flex h-13 w-full items-center justify-center rounded-[14px] bg-wine-700 text-base font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:opacity-70"
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? 'Sending…' : 'Send me the link'}
            </button>
          </form>

          <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-wine-700 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to log in
          </Link>
        </>
      )}
    </AuthScene>
  )
}
