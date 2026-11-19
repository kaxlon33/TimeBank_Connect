<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use Illuminate\Database\Seeder;

/**
 * Default admin-editable settings (PRD business rules, design 10.1).
 * Uses firstOrCreate so re-seeding never overwrites values an admin has changed.
 */
class SettingSeeder extends Seeder
{
    public function run(): void
    {
        AppSetting::firstOrCreate(['key' => 'starter_credit'], ['value' => 3]);

        AppSetting::firstOrCreate(['key' => 'matching'], ['value' => [
            'weights' => [
                'skill' => 40,
                'location' => 25,
                'availability' => 15,
                'reputation' => 20,
            ],
            'max_distance_km' => 25,
            'min_score' => 30,
            'max_results' => 10,
        ]]);
    }
}
