<?php

namespace App\Enums;

/**
 * Help request life cycle:
 * pending -> accepted | declined | cancelled
 * accepted -> awaiting_confirmation (provider marks "session done") | cancelled
 * awaiting_confirmation -> completed (requester confirms; credits move) | cancelled
 */
enum RequestStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case AwaitingConfirmation = 'awaiting_confirmation';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    /** Statuses in which the request is still open (not final). */
    public static function open(): array
    {
        return [self::Pending, self::Accepted, self::AwaitingConfirmation];
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Declined, self::Cancelled, self::Completed], true);
    }
}
