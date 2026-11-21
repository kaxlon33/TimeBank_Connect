<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\HelpRequest;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReviewService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly TrustScoreService $trust,
        private readonly BadgeService $badges,
    ) {}

    /** After a completed session either person can review the other, once. */
    public function submit(HelpRequest $request, User $reviewer, int $rating, ?string $comment): Review
    {
        if (! $request->isParticipant($reviewer)) {
            abort(403, 'This request is not yours.');
        }
        if ($request->status !== RequestStatus::Completed) {
            abort(409, 'You can review a session once it is completed.');
        }

        $reviewee = $request->requester_id === $reviewer->id ? $request->provider : $request->requester;

        try {
            return DB::transaction(function () use ($request, $reviewer, $reviewee, $rating, $comment) {
                $review = new Review(['rating' => $rating, 'comment' => $comment]);
                $review->forceFill([
                    'help_request_id' => $request->id,
                    'reviewer_id' => $reviewer->id,
                    'reviewee_id' => $reviewee->id,
                ])->save();

                $this->notifications->send(
                    $reviewee,
                    'review_received',
                    Str::before($reviewer->name, ' ')." left you a {$rating} star review",
                    $comment ? '“'.Str::limit($comment, 120).'”' : 'Open your profile to see it.',
                    '/profile',
                );

                $this->badges->evaluate($reviewee, $this->trust->recalculate($reviewee));

                return $review;
            });
        } catch (UniqueConstraintViolationException) {
            abort(409, 'You have already reviewed this session.');
        }
    }
}
