<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Country;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\HelpRequestTestCase;

class ProfileWriteTest extends HelpRequestTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CountrySeeder::class);
        Storage::fake('public');
        Cache::flush();
    }

    private function profile(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Alice Updated',
            'bio' => 'I love fixing things.',
            'country_code' => 'GB',
            'area_name' => 'Hackney',
        ], $overrides);
    }

    public function test_a_member_can_update_name_bio_and_area(): void
    {
        $this->as($this->alice)->putJson('/api/profile', $this->profile())
            ->assertOk()
            ->assertJsonPath('data.name', 'Alice Updated')
            ->assertJsonPath('data.bio', 'I love fixing things.')
            ->assertJsonPath('data.area.name', 'Hackney')
            ->assertJsonPath('data.area.country_code', 'GB');

        $this->assertSame('Alice Updated', $this->alice->fresh()->name);
        $this->assertSame(1, Area::query()->where('name', 'Hackney')->count());
    }

    public function test_the_same_area_is_reused(): void
    {
        $this->as($this->alice)->putJson('/api/profile', $this->profile())->assertOk();
        $this->as($this->bob)->putJson('/api/profile', $this->profile(['name' => 'Bob', 'area_name' => ' hackney ']))->assertOk();

        $this->assertSame(1, Area::query()->count());
    }

    public function test_a_new_area_is_placed_on_the_map_through_nominatim(): void
    {
        config(['services.nominatim.enabled' => true]);
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response([
            ['place_id' => 123, 'lat' => '51.5450000', 'lon' => '-0.0553000', 'name' => 'Hackney', 'display_name' => 'Hackney, London, England', 'address' => ['suburb' => 'Hackney']],
        ])]);

        $this->as($this->alice)->putJson('/api/profile', $this->profile())
            ->assertOk()->assertJsonPath('data.area.latitude', 51.545)->assertJsonPath('data.area.longitude', -0.0553);

        Http::assertSent(fn ($r) => str_contains($r->url(), 'countrycodes=gb') && str_contains($r->url(), 'q=Hackney') && $r->hasHeader('User-Agent', config('services.nominatim.user_agent')));
    }

    public function test_the_profile_still_saves_when_nominatim_is_down(): void
    {
        config(['services.nominatim.enabled' => true]);
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response('down', 503)]);

        $this->as($this->alice)->putJson('/api/profile', $this->profile())
            ->assertOk()->assertJsonPath('data.area.name', 'Hackney')->assertJsonPath('data.area.latitude', null);
    }

    public function test_role_balance_and_status_cannot_be_changed_through_the_profile(): void
    {
        $this->as($this->alice)->putJson('/api/profile', $this->profile(['role' => 'admin', 'credit_balance' => 999, 'status' => 'suspended', 'trust_score' => 100, 'email' => 'hacker@example.test']))
            ->assertOk();

        $alice = $this->alice->fresh();
        $this->assertSame('member', $alice->role->value);
        $this->assertSame('active', $alice->status->value);
        $this->assertSame('3.00', (string) $alice->credit_balance);
        $this->assertNotSame('hacker@example.test', $alice->email);
    }

    public function test_the_profile_form_is_validated(): void
    {
        $this->as($this->alice);
        $this->putJson('/api/profile', $this->profile(['name' => 'A']))->assertStatus(422)->assertJsonValidationErrors('name');
        $this->putJson('/api/profile', $this->profile(['country_code' => 'ZZ']))->assertStatus(422)->assertJsonValidationErrors('country_code');
        $this->putJson('/api/profile', $this->profile(['area_name' => '']))->assertStatus(422)->assertJsonValidationErrors('area_name');
        $this->putJson('/api/profile', $this->profile(['bio' => str_repeat('x', 501)]))->assertStatus(422)->assertJsonValidationErrors('bio');
    }

    public function test_an_avatar_can_be_uploaded_replaced_kept_and_removed(): void
    {
        $this->as($this->alice)->putJson('/api/profile', $this->profile(['avatar_url' => $this->pngDataUrl()]))->assertOk();
        $first = $this->alice->fresh()->avatar_path;
        Storage::disk('public')->assertExists($first);

        // Not sending avatar_url keeps it.
        $this->as($this->alice)->putJson('/api/profile', $this->profile(['name' => 'Alice Again']))->assertOk();
        $this->assertSame($first, $this->alice->fresh()->avatar_path);

        $this->as($this->alice)->putJson('/api/profile', $this->profile(['avatar_url' => $this->pngDataUrl(48, 48)]))->assertOk();
        $second = $this->alice->fresh()->avatar_path;
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->as($this->alice)->putJson('/api/profile', $this->profile(['avatar_url' => null]))->assertOk()->assertJsonPath('data.avatar_url', null);
        Storage::disk('public')->assertMissing($second);
    }

    public function test_a_fake_avatar_is_rejected(): void
    {
        $this->as($this->alice)->putJson('/api/profile', $this->profile(['avatar_url' => 'data:image/png;base64,'.base64_encode('<?php echo 1;')]))
            ->assertStatus(422)->assertJsonValidationErrors('avatar_url');
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_availability_is_replaced_as_a_whole(): void
    {
        $this->as($this->bob)->putJson('/api/profile/availability', ['slots' => [
            ['weekday' => 1, 'start_time' => '09:00', 'end_time' => '12:00'],
            ['weekday' => 1, 'start_time' => '14:00', 'end_time' => '17:00'],
            ['weekday' => 6, 'start_time' => '10:00', 'end_time' => '13:00'],
        ]])->assertOk()->assertJsonCount(3, 'data.availability')->assertJsonPath('data.availability.0.start_time', '09:00');

        $this->as($this->bob)->putJson('/api/profile/availability', ['slots' => [
            ['weekday' => 3, 'start_time' => '18:00', 'end_time' => '20:00'],
        ]])->assertOk()->assertJsonCount(1, 'data.availability')->assertJsonPath('data.availability.0.weekday', 3);

        $this->as($this->bob)->putJson('/api/profile/availability', ['slots' => []])->assertOk()->assertJsonCount(0, 'data.availability');
    }

    public function test_availability_rejects_bad_times_and_overlaps(): void
    {
        $this->as($this->bob);
        $this->putJson('/api/profile/availability', ['slots' => [['weekday' => 1, 'start_time' => '12:00', 'end_time' => '09:00']]])->assertStatus(422);
        $this->putJson('/api/profile/availability', ['slots' => [['weekday' => 1, 'start_time' => '09:00', 'end_time' => '09:00']]])->assertStatus(422);
        $this->putJson('/api/profile/availability', ['slots' => [['weekday' => 9, 'start_time' => '09:00', 'end_time' => '10:00']]])->assertStatus(422);
        $this->putJson('/api/profile/availability', ['slots' => [['weekday' => 1, 'start_time' => '9am', 'end_time' => '10:00']]])->assertStatus(422);
        $this->putJson('/api/profile/availability', ['slots' => [
            ['weekday' => 2, 'start_time' => '09:00', 'end_time' => '12:00'],
            ['weekday' => 2, 'start_time' => '11:00', 'end_time' => '13:00'],
        ]])->assertStatus(422);
        $this->putJson('/api/profile/availability', [])->assertStatus(422);

        $this->assertSame(0, $this->bob->availabilitySlots()->count());
    }

    public function test_a_failed_availability_update_keeps_the_old_times(): void
    {
        $this->as($this->bob)->putJson('/api/profile/availability', ['slots' => [['weekday' => 1, 'start_time' => '09:00', 'end_time' => '10:00']]])->assertOk();
        $this->as($this->bob)->putJson('/api/profile/availability', ['slots' => [['weekday' => 1, 'start_time' => '12:00', 'end_time' => '09:00']]])->assertStatus(422);

        $this->assertSame(1, $this->bob->availabilitySlots()->count());
    }

    public function test_profile_writes_need_a_signed_in_member(): void
    {
        $this->app['auth']->forgetGuards();
        $this->putJson('/api/profile', $this->profile())->assertUnauthorized();
        $this->putJson('/api/profile/availability', ['slots' => []])->assertUnauthorized();
        $this->assertNotNull(Country::query()->first());
    }
}
