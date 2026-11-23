<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * When each demo member last used the app, so the admin "inactive" view has something to show:
 * two members have been quiet for a while. Only fills members that have no value yet.
 */
class ActivitySeeder extends Seeder
{
    public function run(): void
    {
        // member id => days since they were last active
        $daysAgo = [2 => 1, 3 => 0, 4 => 3, 5 => 0, 6 => 47, 7 => 5, 8 => 62, 9 => 12, 10 => 2];

        foreach ($daysAgo as $id => $days) {
            User::query()->whereKey($id)->whereNull('last_active_at')->toBase()
                ->update(['last_active_at' => now()->subDays($days)->subHours(2)]);
        }
    }
}
