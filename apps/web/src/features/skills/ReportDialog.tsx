import { useState, type FormEvent } from 'react'
import { Flag, Loader2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ID } from '@/types'

const REASONS = ['Spam or an advert', 'Rude or offensive', 'Not a real skill exchange', 'Something else'] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'skill' | 'review'
  targetId: ID
  /** Shown in the heading, for example the skill title. */
  subject: string
}

/** Lets a member tell the moderators about a skill post or a review that breaks the community rules. */
export function ReportDialog({ open, onOpenChange, kind, targetId, subject }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-wine-900/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-popover p-6 shadow-raised outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <ReportForm kind={kind} targetId={targetId} subject={subject} onDone={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ReportForm({ kind, targetId, subject, onDone }: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0])
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const text = details.trim() ? `${reason}: ${details.trim()}` : reason
      await api.reportContent(kind, targetId, text.slice(0, 300))
      toast.success('Thank you. A moderator will take a look.')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send your report. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="grid size-11 place-items-center rounded-2xl bg-status-declined-bg text-status-declined">
            <Flag className="size-5" aria-hidden="true" />
          </span>
          <Dialog.Title className="font-heading mt-3 text-2xl leading-tight font-bold tracking-[-0.03em]">Report this {kind}</Dialog.Title>
          <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">{subject}</Dialog.Description>
        </div>
        <Dialog.Close aria-label="Close" className="press grid size-10 shrink-0 place-items-center rounded-full border hover:bg-secondary">
          <X className="size-5" aria-hidden="true" />
        </Dialog.Close>
      </div>

      <fieldset className="mt-5 space-y-2">
        <legend className="mb-1 text-sm font-bold">What is wrong?</legend>
        {REASONS.map((r) => (
          <label
            key={r}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors',
              reason === r ? 'border-wine-700 bg-primary-soft text-wine-800' : 'hover:bg-secondary',
            )}
          >
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-[var(--color-wine-700)]"
            />
            {r}
          </label>
        ))}
      </fieldset>

      <label htmlFor="report-details" className="mt-4 block text-sm font-bold">
        Anything else we should know? <span className="font-medium text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id="report-details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={200}
        rows={3}
        className="mt-1.5 w-full resize-none rounded-2xl border bg-card p-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-wine-600"
      />

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-negative">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-wine-700 text-sm font-bold text-wine-on hover:bg-wine-600 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Send report
      </button>
    </form>
  )
}

/** A quiet link that opens the report dialog. Keeps its own open/closed state so any page can drop it in. */
export function ReportButton({
  kind,
  targetId,
  subject,
  label,
  iconOnly = false,
}: Pick<Props, 'kind' | 'targetId' | 'subject'> & { label: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? label : undefined}
        className={cn(
          'press inline-flex items-center gap-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-negative',
          iconOnly ? 'size-8 justify-center hover:bg-status-declined-bg' : 'h-9 px-3 hover:bg-status-declined-bg',
        )}
      >
        <Flag className="size-3.5" aria-hidden="true" />
        {iconOnly ? null : label}
      </button>
      <ReportDialog open={open} onOpenChange={setOpen} kind={kind} targetId={targetId} subject={subject} />
    </>
  )
}
