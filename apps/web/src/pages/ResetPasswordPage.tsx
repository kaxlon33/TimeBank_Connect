import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AuthScene } from '@/features/auth/AuthScene'
import { api, ApiError } from '@/lib/api'
import { describedBy } from '@/lib/forms'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errs = {}
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirm !== password) next.confirm = 'The two passwords do not match.'
    setErrs(next)
    if (next.password || next.confirm) return
    setBusy(true)
    setError(null)
    try {
      await api.resetPassword({ token, email, password })
      navigate('/login', { replace: true, state: { notice: 'Your password is changed. Log in with the new one.' } })
    } catch (err) {
      if (err instanceof ApiError && err.errors.password) setErrs({ password: err.errors.password })
      else setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const invalidLink = !token

  return (
    <AuthScene
      verbs={['Keep', 'Save', 'Earn']}
      headlineLabel="Choose a new password and get back to helping."
      secondLine="and get back to helping."
      intro="Pick a password you have not used elsewhere. At least 8 characters."
      headerLink={{ to: '/login', hint: 'Back to', label: 'Log in' }}
      cardLabelledBy="reset-title"
    >
      {invalidLink ? (
        <div role="alert">
          <span className="grid size-14 place-items-center rounded-2xl bg-status-declined-bg text-status-declined">
            <TriangleAlert className="size-7" aria-hidden="true" />
          </span>
          <h2 id="reset-title" className="mt-4 text-3xl">
            This link is not valid
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">The reset link is missing or has expired. Ask for a new one.</p>
          <Link
            to="/forgot-password"
            className="press mt-5 inline-flex h-12 items-center rounded-[14px] bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Ask for a new link
          </Link>
        </div>
      ) : (
        <>
          <h2 id="reset-title" className="text-3xl">
            Choose a new password
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{email ? `For ${email}` : 'Enter it twice so we know it is right.'}</p>

          {error ? (
            <p role="alert" className="mt-4 rounded-[12px] bg-status-declined-bg px-3 py-2.5 text-sm font-semibold text-status-declined">
              {error}{' '}
              <Link to="/forgot-password" className="underline">
                Ask for a new link
              </Link>
            </p>
          ) : null}

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="reset-password" className="mb-1.5 block text-sm font-semibold">
                New password
              </label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrs((x) => ({ ...x, password: undefined }))
                  }}
                  className="pr-12"
                  aria-invalid={!!errs.password || undefined}
                  aria-describedby={describedBy('reset-password', errs.password)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-[10px] text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
              {errs.password ? (
                <p id="reset-password-error" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                  {errs.password}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-semibold">
                Repeat the password
              </label>
              <Input
                id="reset-confirm"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setErrs((x) => ({ ...x, confirm: undefined }))
                }}
                aria-invalid={!!errs.confirm || undefined}
                aria-describedby={describedBy('reset-confirm', errs.confirm)}
              />
              {errs.confirm ? (
                <p id="reset-confirm-error" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                  {errs.confirm}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="press flex h-13 w-full items-center justify-center rounded-[14px] bg-wine-700 text-base font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:opacity-70"
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </>
      )}
    </AuthScene>
  )
}
