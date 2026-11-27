import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Check, Loader2, Move, ZoomIn } from 'lucide-react'
import { CENTRE, cropToCover, type Focus } from '@/lib/image'

interface Props {
  file: File
  onDone: (dataUrl: string) => void
  onCancel: () => void
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(Math.max(v, lo), hi)

/**
 * Lets the member choose which part of their picture shows on the skill card:
 * drag the picture (or use the arrow keys) to move it, and the slider to zoom.
 * The box has the same 4:3 shape as the card, so what you see is what is saved.
 */
export function PictureFramer({ file, onDone, onCancel }: Props) {
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; start: Focus } | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [frameW, setFrameW] = useState(0)
  const [focus, setFocus] = useState<Focus>(CENTRE)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    setNatural(null)
    setFocus(CENTRE)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => setFrameW(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Size the picture so it always covers the box, then place it by the focus.
  const frameH = (frameW * 3) / 4
  const scale = natural && frameW ? Math.max(frameW / natural.w, frameH / natural.h) * focus.zoom : 0
  const shownW = natural ? natural.w * scale : 0
  const shownH = natural ? natural.h * scale : 0
  const freeX = Math.max(shownW - frameW, 0)
  const freeY = Math.max(shownH - frameH, 0)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, start: focus }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    setFocus((f) => ({
      ...f,
      x: freeX ? clamp(d.start.x - (e.clientX - d.x) / freeX) : 0.5,
      y: freeY ? clamp(d.start.y - (e.clientY - d.y) / freeY) : 0.5,
    }))
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = 0.05
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setFocus((f) => ({ ...f, x: clamp(f.x + move[0]), y: clamp(f.y + move[1]) }))
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      onDone(await cropToCover(file, focus))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not use that picture.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Choose what your picture shows" className="space-y-3 rounded-[22px] border bg-secondary/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Move className="size-4 text-wine-700" aria-hidden="true" />
        Drag the picture to choose what shows on your card.
      </p>

      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-label="Picture position. Drag it, or use the arrow keys to move it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
        className="relative aspect-[4/3] w-full cursor-grab touch-none overflow-hidden rounded-2xl bg-wine-900 outline-none select-none focus-visible:ring-4 focus-visible:ring-wine-600/30 active:cursor-grabbing"
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{
              position: 'absolute',
              maxWidth: 'none',
              width: shownW || '100%',
              height: shownH || 'auto',
              left: -freeX * focus.x,
              top: -freeY * focus.y,
              opacity: natural ? 1 : 0,
            }}
          />
        ) : null}
        {/* Rule-of-thirds guides help line up the main subject. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="border-[0.5px] border-white/35" />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <ZoomIn className="size-4 shrink-0 text-wine-700" aria-hidden="true" />
        <span className="shrink-0">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={focus.zoom}
          onChange={(e) => setFocus((f) => ({ ...f, zoom: Number(e.target.value) }))}
          className="w-full accent-wine-700"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="press h-10 rounded-xl border bg-card px-4 text-sm font-bold hover:bg-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !natural}
          className="press flex h-10 items-center gap-2 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on hover:bg-wine-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          Use this picture
        </button>
      </div>
    </section>
  )
}
