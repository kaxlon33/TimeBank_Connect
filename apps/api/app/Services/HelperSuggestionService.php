<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Skill;
use App\Models\User;
use App\Support\Geo;
use Carbon\CarbonInterface;

/**
 * Suggests helpers for a request with a simple, explainable score (no machine learning).
 *
 * Points out of 100:
 *   - Distance (40): full marks in the same area, falling in a straight line to 0 at 50 km.
 *   - Trust (25): the helper's trust score out of 100, scaled to 25.
 *   - Availability (20): 20 if the helper has set any times they are free.
 *   - Activity (15): 15 if active in the last 7 days, 7 if in the last 30 days.
 *
 * Only active members who offer a skill in the same category are considered, one entry per helper.
 */
final class HelperSuggestionService
{
    public const LIMIT = 5;

    private const NEAR_KM = 50;

    /** @return list<array{user: User, score: int, distance_km: ?float, reasons: list<string>}> */
    public function suggest(Skill $skill, User $requester): array
    {
        $skills = Skill::query()->listable()
            ->where('skills.category_id', $skill->category_id)
            ->where('skills.user_id', '!=', $requester->id)
            ->with(['user.area', 'user.availabilitySlots:id,user_id'])
            ->get();

        return $skills
            ->unique('user_id')
            ->map(fn (Skill $offer) => $this->score($offer->user, $requester->area))
            ->sortByDesc('score')
            ->take(self::LIMIT)
            ->values()
            ->all();
    }

    /** @return array{user: User, score: int, distance_km: ?float, reasons: list<string>} */
    private function score(User $helper, ?Area $here): array
    {
        $points = 0;
        $reasons = [];

        // Distance, only when both areas have a position.
        $km = null;
        $theirs = $helper->area;
        if ($here?->latitude !== null && $theirs?->latitude !== null) {
            $km = Geo::distanceKm((float) $here->latitude, (float) $here->longitude, (float) $theirs->latitude, (float) $theirs->longitude);
            $distancePoints = (int) round(40 * max(0, 1 - $km / self::NEAR_KM));
            $points += $distancePoints;
            $reasons[] = $km < 0.2 ? 'In your area' : sprintf('%.1f km away', $km);
        }

        // Trust.
        $trust = (float) $helper->trust_score;
        $points += (int) round(25 * $trust / 100);
        $reasons[] = 'Trust score '.(int) round($trust);

        // Availability.
        if ($helper->availabilitySlots->isNotEmpty()) {
            $points += 20;
            $reasons[] = 'Has set free times';
        }

        // Activity.
        $days = $this->daysSince($helper->last_active_at);
        if ($days !== null && $days <= 7) {
            $points += 15;
            $reasons[] = 'Active this week';
        } elseif ($days !== null && $days <= 30) {
            $points += 7;
            $reasons[] = 'Active this month';
        }

        return ['user' => $helper, 'score' => min(100, $points), 'distance_km' => $km !== null ? round($km, 1) : null, 'reasons' => $reasons];
    }

    private function daysSince(?CarbonInterface $when): ?int
    {
        return $when === null ? null : (int) $when->diffInDays(now(), true);
    }
}
