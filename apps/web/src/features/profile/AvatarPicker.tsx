import { useId, useRef, useState } from 'react'
import { Camera, Check, Loader2, Upload } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { AVATAR_PICKS, presetValue } from '@/lib/avatarLooks'
import { resizeToAvatar } from '@/lib/image'
import { cn } from '@/lib/utils'

interface Props {
  name: string
  value: string | null
  onSelect: (src: string | null) => Promise<void>
}

/** Choose a friendly character, upload a picture or take one with the camera. */
export function AvatarPicker({ name, value, onSelect }: Props) {
  const id = useId()
  const camera = useRef<HTMLInputElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(key: string, src: string | null) {
    setBusy(key)
    setError(null)
    try {
      await onSelect(src)
    } catch {
      setError('We could not save that. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy('photo')
    setError(null)
    try {
      await onSelect(await resizeToAvatar(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not use that photo.')
    } finally {
      setBusy(null)
    }
  }

  const isPhoto = Boolean(value) && !value?.startsWith('preset:')
  const options: { key: string; src: string | null; label: string }[] = [
    { key: 'default', src: null, label: 'Default' },
    ...AVATAR_PICKS.map((k) => ({ key: k, src: presetValue(k), label: `Character ${k}` })),
  ]

  return (
    <section id="avatar-picker" aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="font-heading text-2xl font-bold tracking-[-0.03em]">
        Your avatar
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">No photo yet? Pick a friendly face. You can change it any time.</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => camera.current?.click()}
          disabled={busy !== null}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-wine-700 px-3 text-[13px] font-bold whitespace-nowrap text-wine-on sm:px-4 sm:text-sm hover:bg-wine-600 disabled:opacity-60"
        >
          {busy === 'photo' ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <Camera className="size-[18px]" aria-hidden="true" />}
          Take a photo
        </button>
        <button
          type="button"
          onClick={() => upload.current?.click()}
          disabled={busy !== null}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl border bg-card px-3 text-[13px] font-bold whitespace-nowrap sm:px-4 sm:text-sm hover:bg-secondary disabled:opacity-60"
        >
          <Upload className="size-[18px]" aria-hidden="true" />
          Upload
        </button>
      </div>

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        tabIndex={-1}
        aria-label="Take a photo"
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={upload}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a photo"
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div role="radiogroup" aria-label="Choose an avatar" className="mt-5 grid grid-cols-5 gap-2.5">
        {isPhoto ? (
          <span className="relative justify-self-center rounded-full p-0.5 ring-[3px] ring-brass">
            <Avatar name={name} src={value} size={52} />
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-wine-700 text-wine-on ring-2 ring-card">
              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="sr-only">Your photo is selected</span>
          </span>
        ) : null}
        {options.map((o) => {
          const on = !isPhoto && (o.src === value || (o.src === null && !value))
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              disabled={busy !== null}
              onClick={() => choose(o.key, o.src)}
              className={cn(
                'press relative justify-self-center rounded-full p-0.5 transition-shadow duration-200 hover:scale-105',
                on ? 'ring-[3px] ring-brass' : 'ring-1 ring-border',
              )}
            >
              <Avatar name={o.src === null ? name : `${o.key} look`} src={o.src} size={52} />
              {on ? (
                <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-wine-700 text-wine-on ring-2 ring-card">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : null}
              {busy === o.key ? (
                <span className="absolute inset-1 grid place-items-center rounded-full bg-white/70">
                  <Loader2 className="size-5 animate-spin text-wine-700" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-negative">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">On a phone, “Take a photo” opens your camera. Photos are resized and kept small.</p>
      )}
    </section>
  )
}
