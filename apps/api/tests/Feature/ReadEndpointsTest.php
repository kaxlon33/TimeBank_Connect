<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Country;
use App\Models\Skill;
use App\Models\SkillCategory;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReadEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private Area $london;

    private SkillCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CountrySeeder::class, SettingSeeder::class]);
        $this->withHeaders(['Referer' => 'http://localhost:5173', 'Accept' => 'application/json']);

        $gb = Country::query()->where('code', 'GB')->firstOrFail();
        $this->london = Area::query()->create(['country_id' => $gb->id, 'name' => 'Camden', 'latitude' => 51.539, 'longitude' => -0.1426]);
        $this->category = SkillCategory::query()->create(['name' => 'Cooking', 'slug' => 'cooking']);
    }

    private function member(string $name, ?Area $area = null): User
    {
        return User::factory()->create(['name' => $name, 'area_id' => ($area ?? $this->london)->id]);
    }

    private function skillFor(User $user, string $title, string $status = 'active'): Skill
    {
        $skill = new Skill(['category_id' => $this->category->id, 'title' => $title, 'description' => "Learn {$title} with me"]);
        $skill->user_id = $user->id;
        $skill->forceFill(['status' => $status])->save();

        return $skill;
    }

    public function test_reference_data_is_public(): void
    {
        $this->getJson('/api/countries')->assertOk()->assertJsonFragment(['code' => 'GB']);
        $this->getJson('/api/categories')->assertOk()->assertJsonPath('data.0.slug', 'cooking');
        $this->getJson('/api/areas?country_code=GB&q=cam')->assertOk()->assertJsonPath('data.0.name', 'Camden');
        $this->getJson('/api/areas?country_code=FR&q=cam')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_private_endpoints_need_a_signed_in_member(): void
    {
        foreach (['/api/skills', '/api/my/skills', '/api/profile', '/api/nearby?lat=51.5&lng=-0.1', '/api/notifications'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    public function test_skill_search_lists_live_skills_including_my_own_and_filters(): void
    {
        $me = $this->member('Me');
        $baker = $this->member('Baker Bea');
        $this->skillFor($me, 'My own skill');
        $this->skillFor($baker, 'Sourdough baking');
        $this->skillFor($baker, 'Hidden idea', 'hidden');

        $this->actingAs($me, 'web');

        // Like a social feed: my own live skills appear next to everyone else's. Hidden ones do not.
        $res = $this->getJson('/api/skills')->assertOk()->assertJsonCount(2, 'data');
        $titles = collect($res->json('data'))->pluck('title')->sort()->values()->all();
        $this->assertSame(['My own skill', 'Sourdough baking'], $titles);
        $res->assertJsonMissingPath('data.0.user.email');

        $this->getJson('/api/skills?q=bea')->assertJsonCount(1, 'data');       // matches the helper's name
        $this->getJson('/api/skills?q=camden')->assertJsonCount(2, 'data');    // both members live there
        $this->getJson('/api/skills?q=nothing-like-this')->assertJsonCount(0, 'data');
        $this->getJson('/api/skills?category=cooking')->assertJsonCount(2, 'data');
        $this->getJson('/api/skills?category=gardening')->assertJsonCount(0, 'data');
    }

    public function test_a_suspended_members_skills_are_not_listed(): void
    {
        $me = $this->member('Me');
        $gone = $this->member('Gone');
        $this->skillFor($gone, 'Ghost lessons');
        $gone->forceFill(['status' => 'suspended'])->save();

        $this->actingAs($me, 'web');
        $this->getJson('/api/skills')->assertJsonCount(0, 'data');
    }

    public function test_skill_detail_returns_the_helper_without_private_fields(): void
    {
        $me = $this->member('Me');
        $helper = $this->member('Helper Hal');
        $skill = $this->skillFor($helper, 'Bike repair');

        $this->actingAs($me, 'web');
        $res = $this->getJson("/api/skills/{$skill->id}")->assertOk();

        $res->assertJsonPath('data.skill.title', 'Bike repair')
            ->assertJsonPath('data.helper.name', 'Helper Hal')
            ->assertJsonMissingPath('data.helper.email')
            ->assertJsonMissingPath('data.helper.credit_balance');
    }

    public function test_a_removed_skill_is_a_404(): void
    {
        $me = $this->member('Me');
        $skill = $this->skillFor($this->member('Helper'), 'Gone', 'removed');

        $this->actingAs($me, 'web');
        $this->getJson("/api/skills/{$skill->id}")->assertNotFound();
    }

    public function test_my_skills_include_hidden_but_not_removed(): void
    {
        $me = $this->member('Me');
        $this->skillFor($me, 'Live');
        $this->skillFor($me, 'Hidden', 'hidden');
        $this->skillFor($me, 'Removed', 'removed');

        $this->actingAs($me, 'web');
        $this->getJson('/api/my/skills')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_profile_returns_my_full_profile(): void
    {
        $me = $this->member('Me');
        $this->actingAs($me, 'web');

        $this->getJson('/api/profile')->assertOk()
            ->assertJsonPath('data.user.email', $me->email)
            ->assertJsonPath('data.user.name', 'Me');
    }

    public function test_nearby_finds_helpers_inside_the_radius_nearest_first(): void
    {
        $me = $this->member('Me');
        $near = $this->member('Near Nina');
        $this->skillFor($near, 'Piano');

        $gb = Country::query()->where('code', 'GB')->firstOrFail();
        $far = Area::query()->create(['country_id' => $gb->id, 'name' => 'Cambridge', 'latitude' => 52.2053, 'longitude' => 0.1218]);
        $farMember = $this->member('Far Fred', $far);
        $this->skillFor($farMember, 'Chess');

        $near->availabilitySlots()->create([
            'weekday' => now()->dayOfWeek, 'start_time' => '00:00:00', 'end_time' => '23:59:59',
        ]);

        $this->actingAs($me, 'web');

        $res = $this->getJson('/api/nearby?lat=51.54&lng=-0.14&radius_km=10')->assertOk();
        $res->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user.name', 'Near Nina')
            ->assertJsonPath('data.0.available_now', true)
            ->assertJsonPath('data.0.skills.0.title', 'Piano');
        $this->assertLessThan(10, $res->json('data.0.distance_km'));

        $this->getJson('/api/nearby?lat=51.54&lng=-0.14&radius_km=150')->assertJsonCount(2, 'data');
    }

    public function test_nearby_pins_are_blurred_and_stable(): void
    {
        $me = $this->member('Me');
        $helper = $this->member('Helper');
        $this->skillFor($helper, 'Piano');
        $this->actingAs($me, 'web');

        $a = $this->getJson('/api/nearby?lat=51.54&lng=-0.14&radius_km=10')->json('data.0');
        $b = $this->getJson('/api/nearby?lat=51.54&lng=-0.14&radius_km=10')->json('data.0');

        $this->assertSame($a['lat'], $b['lat']);
        $this->assertNotSame(51.539, $a['lat']);          // not the exact area point
        $this->assertEqualsWithDelta(51.539, $a['lat'], 0.01);
    }

    public function test_nearby_validates_its_input(): void
    {
        $this->actingAs($this->member('Me'), 'web');
        $this->getJson('/api/nearby?lat=999&lng=0')->assertStatus(422)->assertJsonValidationErrors('lat');
        $this->getJson('/api/nearby')->assertStatus(422);
    }

    public function test_notifications_can_be_listed_and_marked_read_and_unread(): void
    {
        $me = $this->member('Me');
        $other = $this->member('Other');
        $this->actingAs($me, 'web');

        $mine = $this->notificationFor($me, 'New request');
        $this->notificationFor($other, 'Not for me');

        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'New request')->assertJsonPath('data.0.read_at', null);

        $this->postJson("/api/notifications/{$mine->id}/read")->assertOk();
        $this->assertNotNull($mine->fresh()->read_at);

        $this->postJson("/api/notifications/{$mine->id}/unread")->assertOk();
        $this->assertNull($mine->fresh()->read_at);

        $this->postJson('/api/notifications/read-all')->assertOk();
        $this->assertNotNull($mine->fresh()->read_at);

        $this->postJson('/api/notifications/unread-all')->assertOk();
        $this->assertNull($mine->fresh()->read_at);
    }

    public function test_a_member_cannot_touch_someone_elses_notification(): void
    {
        $me = $this->member('Me');
        $theirs = $this->notificationFor($this->member('Other'), 'Private');

        $this->actingAs($me, 'web');
        $this->postJson("/api/notifications/{$theirs->id}/read")->assertNotFound();
        $this->assertNull($theirs->fresh()->read_at);
    }

    private function notificationFor(User $user, string $title): DatabaseNotification
    {
        return DatabaseNotification::query()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Demo',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => ['type' => 'request_received', 'title' => $title, 'body' => 'Body', 'link' => '/requests'],
        ]);
    }
}
