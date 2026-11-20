import { relativeTime } from '@/lib/format'
import type { HelpRequest, RequestStatus } from '@/types'

export type Box = 'received' | 'sent'
export type Group = 'needs' | 'progress' | 'done'
export type Action = 'accept' | 'decline' | 'mark_done' | 'cancel' | 'confirm'

/** Who has to do something next decides which group a request sits in. */
export function groupOf(r: HelpRequest, box: Box): Group {
  if (r.status === 'completed' || r.status === 'declined' || r.status === 'cancelled') return 'done'
  if (box === 'received') return r.status === 'pending' || r.status === 'accepted' ? 'needs' : 'progress'
  return r.status === 'awaiting_confirmation' ? 'needs' : 'progress'
}

export const otherParty = (r: HelpRequest, box: Box) => (box === 'received' ? r.requester : r.provider)

export const tagClass: Record<RequestStatus, string> = {
  pending: 'bg-status-pending-bg text-status-pending',
  accepted: 'bg-status-accepted-bg text-status-accepted',
  awaiting_confirmation: 'bg-status-awaiting-bg text-status-awaiting',
  completed: 'bg-status-completed-bg text-status-completed',
  declined: 'bg-status-declined-bg text-status-declined',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled',
}

export function statusLabel(r: HelpRequest, box: Box): string {
  switch (r.status) {
    case 'pending':
      return 'Pending'
    case 'accepted':
      return 'Accepted'
    case 'awaiting_confirmation':
      return box === 'sent' ? 'Confirm' : 'Waiting'
    case 'completed':
      return 'Completed'
    case 'declined':
      return 'Declined'
    default:
      return 'Cancelled'
  }
}

export const groupMeta: Record<Group, { label: string; dot: string }> = {
  needs: { label: 'Needs you', dot: 'bg-wine-600' },
  progress: { label: 'In progress', dot: 'bg-status-accepted' },
  done: { label: 'Done', dot: 'bg-status-completed' },
}

export const actionMessages: Record<Action, string> = {
  accept: 'Request accepted',
  decline: 'Request declined',
  mark_done: 'Marked as done. They will confirm next',
  cancel: 'Request cancelled',
  confirm: 'Session confirmed and credits paid',
}

/** The proposed day, or how long ago it was sent when no time was suggested. */
export function whenLabel(r: HelpRequest): string {
  return r.proposed_at
    ? new Date(r.proposed_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : relativeTime(r.created_at)
}
