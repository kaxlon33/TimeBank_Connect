import { useId, useState } from 'react'
import { Loader2, Star, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'

const hints = ['Not good', 'Could be better', 'Good', 'Very good', 'Excellent']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  skillTitle: string
  onSubmit: (rating: number, comment: string) => Promise<void>
}

export function ReviewDialog({ open, onOpenChange, name, skillTitle, onSubmit }: Props) {
  const id = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const first = name.split(' ')[0]

  async function submit() {
    if (!rating) {
      setError('Tap a star to rate the session.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(rating, comment.trim())
      onOpenChange(false)
      setRating(0)
      setComment('')
    } catch {
      setError('We could not save your review. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-wine-900/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[32px] bg-popover p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-raised outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px] sm:p-8 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <Dialog.Close
            aria-label="Close"
            className="press absolute top-4 right-4 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </Dialog.Close>

          <div className="flex items-center gap-3.5">
            <Avatar name={name} size={52} />
            <div>
              <Dialog.Title className="font-heading text-2xl leading-tight font-bold tracking-[-0.03em]">
                How was it with {first}?
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{skillTitle}</Dialog.Description>
            </div>
          </div>

          <div role="radiogroup" aria-label="Rating" className="mt-7 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                onClick={() => {
                  setRating(n)
                  setError(null)
                }}
                className="press grid size-12 place-items-center rounded-2xl transition-transform duration-150 hover:scale-110"
              >
                <Star
                  className={cn(
                    'size-9 transition-colors duration-150',
                    n <= rating ? 'fill-brass-ink text-brass-ink' : 'text-stone-200',
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 h-5 text-center text-sm font-bold text-wine-700">
            {rating ? hints[rating - 1] : ''}
          </p>

          <label htmlFor={`${id}-comment`} className="mt-5 block text-sm font-bold">
            Add a comment <span className="font-medium text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`${id}-comment`}
            value={comment}
            maxLength={300}
            rows={3}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`What made it good, ${first}?`}
            className="mt-2 w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />

          {error ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-negative">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wine-700 text-[15px] font-bold text-wine-on hover:bg-wine-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : null}
            {busy ? 'Saving…' : 'Submit review'}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
