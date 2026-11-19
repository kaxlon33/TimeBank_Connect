<?php

namespace Database\Seeders;

use App\Models\SkillCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SkillCategorySeeder extends Seeder
{
    public const CATEGORIES = [
        'Home and Garden',
        'Repairs and DIY',
        'Tech Help',
        'Tutoring and Languages',
        'Cooking and Baking',
        'Care and Companionship',
        'Transport and Errands',
        'Arts, Crafts and Music',
        'Health and Fitness',
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as $i => $name) {
            SkillCategory::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'is_active' => true, 'sort_order' => ($i + 1) * 10],
            );
        }
    }
}
