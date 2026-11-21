<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Enums\ReviewStatus;
use App\Models\HelpRequest;
use App\Models\Review;
use Illuminate\Support\Collection;

/**
 * Completed-session counts and star ratings for many members in two or three queries,
 * so a list of 60 skills does not run 120 extra queries.
 */
class UserStatsService
{
    /**
     * Attach `completed_sessions` and `rating_avg` / `rating_count` to each user model.
     *
     * @param  iterable<\App\Models\User>  $users
     */
    public function attach(iterable $users): void
    {
        $users = Collection::make($users)->filter()->unique('id');
        if ($users->isEmpty()) {
            return;
        }

        $ids = $users->pluck('id')->all();

        $asRequester = HelpRequest::query()->where('status', RequestStatus::Completed->value)
            ->whereIn('requester_id', $ids)->selectRaw('requester_id AS uid, COUNT(*) AS n')->groupBy('requester_id')->pluck('n', 'uid');
        $asProvider = HelpRequest::query()->where('status', RequestStatus::Completed->value)
            ->whereIn('provider_id', $ids)->selectRaw('provider_id AS uid, COUNT(*) AS n')->groupBy('provider_id')->pluck('n', 'uid');

        $ratings = Review::query()->where('status', ReviewStatus::Visible->value)
            ->whereIn('reviewee_id', $ids)->selectRaw('reviewee_id AS uid, AVG(rating) AS avg_rating, COUNT(*) AS n')
            ->groupBy('reviewee_id')->get()->keyBy('uid');

        foreach ($users as $user) {
            $rating = $ratings->get($user->id);
            $user->setAttribute('completed_sessions', (int) ($asRequester[$user->id] ?? 0) + (int) ($asProvider[$user->id] ?? 0));
            $user->setAttribute('rating_avg', $rating ? round((float) $rating->avg_rating, 2) : null);
            $user->setAttribute('rating_count', $rating ? (int) $rating->n : 0);
        }
    }
}
