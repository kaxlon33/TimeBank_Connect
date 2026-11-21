<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Reference data (countries, categories, badges, settings) is safe to re-run.
     * DemoDataSeeder is for a fresh local database: use `php artisan migrate:fresh --seed`.
     */
    public function run(): void
    {
        $this->call([
            CountrySeeder::class,
            SkillCategorySeeder::class,
            BadgeSeeder::class,
            SettingSeeder::class,
            DemoDataSeeder::class,
            NotificationSeeder::class,
        ]);

        // The demo members' trust scores are worked out from their sessions and reviews, not typed in.
        $this->command->call('trust:recalculate');
    }
}
