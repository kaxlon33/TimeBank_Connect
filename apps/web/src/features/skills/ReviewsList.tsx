import { useSyncExternalStore } from 'react'
import { Avatar } from '@/components/Avatar'
import { StarRating } from '@/components/StarRating'
import { sessionStore } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import { ReportButton } from './ReportDialog'
import type { PublicProfile, Review } from '@/types'

/** A big rating on the left, a calm list of reviews on the right. */
export function ReviewsList({ helper, reviews }: { helper: PublicProfile; reviews: Review[] }) {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const first = helper.name.split(' ')[0]

  if (!reviews.length) {
    return <p className="text-muted-foreground">No reviews yet. Be the first to work with {first}.</p>
  }

  const average = helper.rating_avg ?? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length

  return (
    <div className="grid gap-6 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-10">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
        <p className="numeral text-[64px] text-wine-700">{average.toFixed(1)}</p>
        <div className="space-y-1.5">
          <StarRating value={average} />
          <p className="text-sm font-semibold text-muted-foreground">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      <ul className="divide-y">
        {reviews.map((r) => (
          <li key={r.id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
            <Avatar name={r.reviewer.name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="text-[15px] font-bold">{r.reviewer.name}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  {relativeTime(r.created_at)}
                  {r.reviewer.id !== me.id ? (
                    <ReportButton
                      kind="review"
                      targetId={r.id}
                      subject={`Review by ${r.reviewer.name}`}
                      label="Report this review"
                      iconOnly
                    />
                  ) : null}
                </p>
              </div>
              <StarRating value={r.rating} className="mt-1.5 [&_svg]:size-3.5" />
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{r.comment}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
