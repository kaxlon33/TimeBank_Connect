<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Country;
use App\Models\Skill;
use App\Models\SkillCategory;
use Database\Seeders\CountrySeeder;
use Tests\HelpRequestTestCase;

class SuggestedHelperTest extends HelpRequestTestCase
{
    private function offer(\App\Models\User $user, SkillCategory $category, string $title): Skill
    {
        $skill = new Skill(['category_id' => $category->id, 'title' => $title, 'description' => 'Help with '.$title]);
        $skill->user_id = $user->id;
        $skill->save();

        return $skill;
    }

    public function test_the_closest_most_trusted_and_available_helper_comes_first(): void
    {
        $this->seed(CountrySeeder::class);
        $gb = Country::query()->where('code', 'GB')->firstOrFail();
        $hackney = Area::query()->create(['country_id' => $gb->id, 'name' => 'Hackney', 'latitude' => 51.5, 'longitude' => -0.1]);
        $this->alice->forceFill(['area_id' => $hackney->id])->save();

        $category = SkillCategory::query()->where('slug', 'repairs')->firstOrFail();
        $this->skill->forceFill(['category_id' => $category->id])->save();

        // Carol: same area, trusted, has set free times, active today.
        $carol = $this->member('Carol Close', 0);
        $carol->forceFill(['area_id' => $hackney->id, 'trust_score' => 90, 'last_active_at' => now()])->save();
        $carol->availabilitySlots()->create(['weekday' => 1, 'start_time' => '09:00', 'end_time' => '12:00']);
        $this->offer($carol, $category, 'Bike tune-up');

        // Dan: no area, low trust, nothing set, inactive for months.
        $dan = $this->member('Dan Distant', 0);
        $dan->forceFill(['trust_score' => 20, 'last_active_at' => now()->subMonths(4)])->save();
        $this->offer($dan, $category, 'Wheel truing');

        $ranked = $this->as($this->alice)->getJson("/api/skills/{$this->skill->id}/helpers")->assertOk()->json('data');

        $this->assertSame($carol->id, $ranked[0]['id']);
        $this->assertGreaterThan($ranked[1]['score'], $ranked[0]['score']);
        $this->assertContains('In your area', $ranked[0]['reasons']);
        $this->assertContains('Has set free times', $ranked[0]['reasons']);
        $this->assertNull(collect($ranked)->firstWhere('id', $dan->id)['distance_km']);
    }

    public function test_the_list_leaves_out_me_suspended_members_and_other_categories(): void
    {
        $category = SkillCategory::query()->create(['name' => 'Gardening', 'slug' => 'gardening']);
        $repairs = SkillCategory::query()->where('slug', 'repairs')->firstOrFail();
        $this->skill->forceFill(['category_id' => $repairs->id])->save();

        // Alice offers the same thing herself: she should not be suggested to herself.
        $this->offer($this->alice, $repairs, 'Shelf fitting');

        $suspended = $this->member('Eve Suspended', 0);
        $suspended->forceFill(['status' => 'suspended'])->save();
        $this->offer($suspended, $repairs, 'Painting');

        $gardener = $this->member('Frank Gardener', 0);
        $this->offer($gardener, $category, 'Hedge trimming');

        $ids = collect($this->as($this->alice)->getJson("/api/skills/{$this->skill->id}/helpers")->assertOk()->json('data'))->pluck('id');

        $this->assertNotContains($this->alice->id, $ids);
        $this->assertNotContains($suspended->id, $ids);
        $this->assertNotContains($gardener->id, $ids);
        $this->assertContains($this->bob->id, $ids); // Bob offers the base skill, so he is a helper too
    }

    public function test_a_helper_who_offers_two_skills_is_listed_once(): void
    {
        $repairs = SkillCategory::query()->where('slug', 'repairs')->firstOrFail();
        $this->skill->forceFill(['category_id' => $repairs->id])->save();

        $this->offer($this->bob, $repairs, 'Second Bob skill');

        $ids = collect($this->as($this->alice)->getJson("/api/skills/{$this->skill->id}/helpers")->assertOk()->json('data'))->pluck('id');

        $this->assertSame(1, $ids->filter(fn ($id) => $id === $this->bob->id)->count());
    }

    public function test_guests_cannot_ask_for_suggestions(): void
    {
        $this->getJson("/api/skills/{$this->skill->id}/helpers")->assertUnauthorized();
    }
}
