<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Enums\ReviewStatus;
use App\Models\HelpRequest;
use App\Models\Review;
use App\Models\User;

/**
 * trust = 0.5 x rating + 0.3 x reliability + 0.2 x experience  (design 10.2), cached in users.trust_score.
 * A brand-new member scores 61.25.
 */
class TrustScoreService
{
    /**
     * The numbers both the trust score and the badges are built from.
     *
     * @return array{completed_total:int, completed_as_provider:int, accepted_as_provider:int, review_count:int, review_avg:float|null, review_sum:int}
     */
    public function stats(User $user): array
    {
        $completedProvider = HelpRequest::query()->where('provider_id', $user->id)
            ->where('status', RequestStatus::Completed->value)->count();
        $completedRequester = HelpRequest::query()->where('requester_id', $user->id)
            ->where('status', RequestStatus::Completed->value)->count();

        // Requests the member said yes to. One they cancelled themselves counts against them.
        $accepted = HelpRequest::query()->where('provider_id', $user->id)->where(fn ($q) => $q
            ->whereIn('status', [RequestStatus::Accepted->value, RequestStatus::AwaitingConfirmation->value, RequestStatus::Completed->value])
            ->orWhere(fn ($c) => $c->where('status', RequestStatus::Cancelled->value)->whereNotNull('responded_at')->where('cancelled_by', $user->id)))
            ->count();

        $reviews = Review::query()->where('reviewee_id', $user->id)->where('status', ReviewStatus::Visible->value);
        $count = (clone $reviews)->count();
        $sum = (int) (clone $reviews)->sum('rating');

        return [
            'completed_total' => $completedProvider + $completedRequester,
            'completed_as_provider' => $completedProvider,
            'accepted_as_provider' => $accepted,
            'review_count' => $count,
            'review_sum' => $sum,
            'review_avg' => $count ? $sum / $count : null,
        ];
    }

    public function score(array $stats): float
    {
        $c = config('timebank.trust');

        $rating = (($stats['review_sum'] + $c['prior_weight'] * $c['prior_stars']) / ($stats['review_count'] + $c['prior_weight']) - 1) / 4 * 100;
        $reliability = ($stats['completed_as_provider'] + 2) / max($stats['accepted_as_provider'] + 2, 1) * 100;
        $experience = min($stats['completed_total'], $c['experience_cap']) / $c['experience_cap'] * 100;

        $trust = $c['weights']['rating'] * $rating + $c['weights']['reliability'] * min($reliability, 100) + $c['weights']['experience'] * $experience;

        return round(max(0, min(100, $trust)), 2);
    }

    /** Recalculate and store the member's trust score. Returns the stats used, for the badge check. */
    public function recalculate(User $user): array
    {
        $stats = $this->stats($user);
        $user->forceFill(['trust_score' => $this->score($stats)])->save();

        return $stats;
    }
}
