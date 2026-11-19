<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

/**
 * Badge definitions (design 10.3). Rules and thresholds live in BadgeService / config/timebank.php.
 */
class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            ['first_exchange', 'First Exchange', 'Completed a first session, as helper or as requester.', 'handshake'],
            ['helping_hand', 'Helping Hand', 'Completed 5 sessions as a helper.', 'hand-heart'],
            ['community_builder', 'Community Builder', 'Completed 10 sessions in total.', 'users'],
            ['top_rated', 'Top Rated', 'At least 5 reviews with an average rating of 4.5 or more.', 'star'],
            ['reliable', 'Reliable', 'Accepted at least 5 requests and completed 90% or more of them.', 'shield-check'],
            ['trusted_member', 'Trusted Member', 'Trust score of 80 or more with at least 5 completed sessions.', 'badge-check'],
        ];

        foreach ($badges as [$code, $name, $description, $icon]) {
            Badge::updateOrCreate(
                ['code' => $code],
                ['name' => $name, 'description' => $description, 'icon' => $icon],
            );
        }
    }
}
