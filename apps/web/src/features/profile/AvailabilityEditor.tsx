import { useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/types'

// Monday first. The data uses 0 = Sunday.
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT = { start: '18:00', end: '21:00' }

/** Every half hour from 06:00 to 22:00. */
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const mins = 6 * 60 + i * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})

interface Row {
  on: boolean
  start: string
  end: string
}
type Week = Record<number, Row>

function toWeek(slots: AvailabilitySlot[]): Week {
  const week: Week = {}
  for (const day of ORDER) {
    const slot = slots.find((s) => s.weekday === day)
    week[day] = slot ? { on: true, start: slot.start_time, end: slot.end_time } : { on: false, ...DEFAULT }
  }
  return week
}

function toSlots(week: Week): AvailabilitySlot[] {
  return ORDER.filter((d) => week[d].on).map((d) => ({
    weekday: d,
    start_time: week[d].start,
    end_time: week[d].end,
  }))
}

function minutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function TimeSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  disabled: boolean
  onChange: (v: string) => void
}) {
  return (
    <span className="relative block">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-wine-700/15 bg-card pr-7 pl-3 text-sm font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </span>
  )
}

/** Pick the days you are free and the hours for each, then save. */
export function AvailabilityEditor({ slots }: { slots: AvailabilitySlot[] }) {
  const [saved, setSaved] = useState(() => toWeek(slots))
  const [week, setWeek] = useState(saved)
  const [busy, setBusy] = useState(false)

  const invalid = useMemo(() => ORDER.filter((d) => week[d].on && minutes(week[d].end) <= minutes(week[d].start)), [week])
  const dirty = JSON.stringify(toSlots(week)) !== JSON.stringify(toSlots(saved))
  const days = ORDER.filter((d) => week[d].on).length
  const hours = ORDER.filter((d) => week[d].on && !invalid.includes(d)).reduce<number>(
    (sum, d) => sum + (minutes(week[d].end) - minutes(week[d].start)) / 60,
    0,
  )

  const patch = (day: number, change: Partial<Row>) => setWeek((w) => ({ ...w, [day]: { ...w[day], ...change } }))

  async function save() {
    if (invalid.length) return
    setBusy(true)
    try {
      await api.updateAvailability(toSlots(week))
      setSaved(week)
      toast.success('Your hours are updated')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not save your hours. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ul className="space-y-2" aria-label="Weekly availability">
        {ORDER.map((day) => {
          const row = week[day]
          const bad = invalid.includes(day)
          return (
            <li
              key={day}
              className={cn(
                'grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-2xl border px-3 py-2.5 transition-colors sm:grid-cols-[auto_5.5rem_1fr]',
                row.on ? 'border-wine-700/15 bg-white/70' : 'border-transparent bg-white/35',
                bad && 'border-negative',
              )}
            >
              <button
                type="button"
                role="switch"
                aria-checked={row.on}
                aria-label={`Free on ${NAMES[day]}`}
                onClick={() => patch(day, { on: !row.on })}
                className={cn(
                  'press relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                  row.on ? 'bg-wine-700' : 'bg-stone-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 size-5 rounded-full bg-white shadow-card transition-transform duration-200',
                    row.on && 'translate-x-5',
                  )}
                />
              </button>
              <span className={cn('text-[15px] font-bold', !row.on && 'text-muted-foreground')}>{NAMES[day]}</span>
              <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:col-span-1">
                <TimeSelect
                  label={`${NAMES[day]} from`}
                  value={row.start}
                  options={TIMES.slice(0, -1)}
                  disabled={!row.on}
                  onChange={(v) => patch(day, { start: v })}
                />
                <span className="text-xs font-semibold text-muted-foreground">to</span>
                <TimeSelect
                  label={`${NAMES[day]} until`}
                  value={row.end}
                  options={TIMES.slice(1)}
                  disabled={!row.on}
                  onChange={(v) => patch(day, { end: v })}
                />
              </div>
              {bad ? (
                <p role="alert" className="col-span-2 text-xs font-semibold text-negative sm:col-span-3">
                  The end time must be after the start time.
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-wine-800">
          {days === 0 ? 'Not set yet' : `${days} ${days === 1 ? 'day' : 'days'} · ${hours % 1 ? hours.toFixed(1) : hours} hours a week`}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty || invalid.length > 0}
          className="press flex h-12 items-center gap-2 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <Check className="size-[18px]" aria-hidden="true" />}
          {busy ? 'Saving…' : dirty ? 'Save hours' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
