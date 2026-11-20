import { useId, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { ID, Skill, SkillCategory, SkillInput } from '@/types'

const TITLE_MAX = 80
const DESC_MAX = 300

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: Skill | null
  categories: SkillCategory[]
  onSubmit: (input: SkillInput) => Promise<void>
}

type Errors = Partial<Record<'title' | 'category' | 'description', string>>

/** Create or edit a skill. The picture on top updates as the title and category change. */
export function SkillFormDialog({ open, onOpenChange, skill, categories, onSubmit }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-wine-900/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] bg-popover shadow-raised outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px] sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          {/* Remount per skill so the form starts from that skill's values. */}
          <SkillForm key={skill?.id ?? 'new'} skill={skill} categories={categories} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SkillForm({
  skill,
  categories,
  onSubmit,
  onClose,
}: {
  skill: Skill | null
  categories: SkillCategory[]
  onSubmit: (input: SkillInput) => Promise<void>
  onClose: () => void
}) {
  const id = useId()
  const [title, setTitle] = useState(skill?.title ?? '')
  const [categoryId, setCategoryId] = useState<ID | null>(skill?.category.id ?? null)
  const [description, setDescription] = useState(skill?.description ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const category = categories.find((c) => c.id === categoryId)
  const picture = skillImage({ title, category: category ? { slug: category.slug } : undefined })

  function validate(): Errors {
    const e: Errors = {}
    if (title.trim().length < 3) e.title = 'Give your skill a short name, at least 3 letters.'
    if (categoryId === null) e.category = 'Choose the category that fits best.'
    if (description.trim().length < 10) e.description = 'Tell people a little more, at least 10 characters.'
    return e
  }

  async function submit() {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length || categoryId === null) return
    setBusy(true)
    setFailed(null)
    try {
      await onSubmit({ title: title.trim(), category_id: categoryId, description: description.trim() })
      onClose()
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'We could not save your skill. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="relative isolate flex h-44 flex-col justify-end overflow-hidden bg-wine-800 p-6 text-white sm:h-52">
        <img src={picture} alt="" width={960} height={720} className="absolute inset-0 -z-20 size-full object-cover transition-opacity duration-300" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/92 via-wine-900/35 to-transparent" />
        <Dialog.Close
          aria-label="Close"
          className="press absolute top-4 right-4 grid size-10 place-items-center rounded-full border border-white/25 bg-wine-900/45 backdrop-blur-md"
        >
          <X className="size-5" aria-hidden="true" />
        </Dialog.Close>
        <Dialog.Title className="font-heading text-[clamp(1.5rem,4vw,2rem)] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
          {title.trim() || (skill ? 'Edit your skill' : 'A new skill')}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-wine-on-muted">
          {category ? `${category.name} · the picture follows your title` : 'The picture follows your title and category'}
        </Dialog.Description>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-title`} className="text-sm font-semibold">
              What can you help with?
            </label>
            <span className="text-xs text-muted-foreground">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            id={`${id}-title`}
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => {
              setTitle(e.target.value)
              setErrors((x) => ({ ...x, title: undefined }))
            }}
            placeholder="e.g. Bicycle repair and tune-ups"
            aria-invalid={!!errors.title || undefined}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            className="h-12 w-full rounded-[12px] border border-input bg-card px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15 aria-invalid:border-negative"
          />
          {errors.title ? (
            <p id={`${id}-title-error`} role="alert" className="text-sm font-medium text-negative">
              {errors.title}
            </p>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Category</legend>
          <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.is_active)
              .map((c) => {
                const on = c.id === categoryId
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setCategoryId(c.id)
                      setErrors((x) => ({ ...x, category: undefined }))
                    }}
                    className={cn(
                      'press flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors',
                      on ? 'border-wine-700 bg-wine-700 text-wine-on' : 'bg-card text-muted-foreground hover:border-stone-200 hover:text-foreground',
                    )}
                  >
                    {on ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : null}
                    {c.name}
                  </button>
                )
              })}
          </div>
          {errors.category ? (
            <p role="alert" className="text-sm font-medium text-negative">
              {errors.category}
            </p>
          ) : null}
        </fieldset>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-desc`} className="text-sm font-semibold">
              Tell people about it
            </label>
            <span className="text-xs text-muted-foreground">
              {description.length}/{DESC_MAX}
            </span>
          </div>
          <textarea
            id={`${id}-desc`}
            value={description}
            maxLength={DESC_MAX}
            rows={4}
            onChange={(e) => {
              setDescription(e.target.value)
              setErrors((x) => ({ ...x, description: undefined }))
            }}
            placeholder="What you can do, what to bring, and anything people should know."
            aria-invalid={!!errors.description || undefined}
            aria-describedby={errors.description ? `${id}-desc-error` : undefined}
            className="w-full resize-none rounded-[14px] border border-input bg-card p-3.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-negative"
          />
          {errors.description ? (
            <p id={`${id}-desc-error`} role="alert" className="text-sm font-medium text-negative">
              {errors.description}
            </p>
          ) : null}
        </div>

        {failed ? (
          <p role="alert" className="text-sm font-semibold text-negative">
            {failed}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Dialog.Close className="press h-14 rounded-2xl border bg-card px-6 text-[15px] font-bold hover:bg-secondary">Cancel</Dialog.Close>
          <button
            type="submit"
            disabled={busy}
            className="press flex h-14 items-center justify-center gap-2 rounded-2xl bg-wine-700 px-7 text-[15px] font-bold text-wine-on hover:bg-wine-600 disabled:opacity-60 sm:min-w-44"
          >
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <Check className="size-[18px]" aria-hidden="true" />}
            {busy ? 'Saving…' : skill ? 'Save changes' : 'Post skill'}
          </button>
        </div>
      </div>
    </form>
  )
}
