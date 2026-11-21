<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\User;

/** Awards badges once, by rule (design 10.3). Thresholds live in config/timebank.php. */
class BadgeService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @param  array  $stats  from TrustScoreService::stats()
     * @return list<string> codes awarded just now
     */
    public function evaluate(User $user, array $stats): array
    {
        $t = config('timebank.badges');
        $trust = (float) $user->trust_score;

        $earned = [];
        if ($stats['completed_total'] >= 1) {
            $earned[] = 'first_exchange';
        }
        if ($stats['completed_as_provider'] >= $t['helping_hand_sessions']) {
            $earned[] = 'helping_hand';
        }
        if ($stats['completed_total'] >= $t['community_builder_sessions']) {
            $earned[] = 'community_builder';
        }
        if ($stats['review_count'] >= $t['top_rated_reviews'] && ($stats['review_avg'] ?? 0) >= $t['top_rated_average']) {
            $earned[] = 'top_rated';
        }
        if ($stats['accepted_as_provider'] >= $t['reliable_accepted']
            && $stats['completed_as_provider'] / max($stats['accepted_as_provider'], 1) >= $t['reliable_rate']) {
            $earned[] = 'reliable';
        }
        if ($trust >= $t['trusted_trust'] && $stats['completed_total'] >= $t['trusted_sessions']) {
            $earned[] = 'trusted_member';
        }

        $have = $user->badges()->pluck('badges.code')->all();
        $new = array_values(array_diff($earned, $have));

        foreach (Badge::query()->whereIn('code', $new)->get() as $badge) {
            // The (user_id, badge_id) primary key makes this safe to repeat.
            $user->badges()->syncWithoutDetaching([$badge->id]);
            $this->notifications->send(
                $user,
                'badge_awarded',
                "You earned the {$badge->name} badge",
                $badge->description,
                '/profile',
            );
        }

        return $new;
    }
}
