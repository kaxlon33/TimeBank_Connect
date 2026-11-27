<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Country;
use App\Services\GeocodingService;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Nominatim (area lookup) and REST Countries (country sync): both faked, never the real internet. */
class ThirdPartyApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Referer' => 'http://localhost:5173', 'Accept' => 'application/json']);
        Cache::flush();
    }

    private function nominatim(array $places, int $status = 200): void
    {
        config(['services.nominatim.enabled' => true]);
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response($places, $status)]);
    }

    private function place(int $id, string $name, string $lat = '51.5', string $lon = '-0.1'): array
    {
        return ['place_id' => $id, 'lat' => $lat, 'lon' => $lon, 'name' => $name, 'display_name' => "{$name}, Somewhere", 'address' => ['suburb' => $name]];
    }

    // ---- Nominatim -------------------------------------------------------------

    public function test_it_turns_a_name_into_places_with_coordinates(): void
    {
        $this->nominatim([$this->place(1, 'Camden', '51.539', '-0.1426'), $this->place(2, 'Camden Town', '51.5392', '-0.1426')]);

        $places = app(GeocodingService::class)->search('Camden', 'GB');

        $this->assertCount(2, $places);
        $this->assertSame('Camden', $places[0]['name']);
        $this->assertSame(51.539, $places[0]['latitude']);
        $this->assertSame(1, $places[0]['osm_place_id']);
    }

    public function test_it_sends_a_generic_user_agent_and_only_the_search_text_and_country(): void
    {
        $this->nominatim([$this->place(1, 'Camden')]);
        app(GeocodingService::class)->search('Camden', 'GB');

        Http::assertSent(function ($request) {
            return $request->hasHeader('User-Agent', 'TimeBankConnect/1.0 (student community project)')
                && str_starts_with($request->url(), 'https://nominatim.openstreetmap.org/search')
                && ! str_contains($request->url(), '@');
        });
    }

    public function test_results_are_cached_so_the_same_search_calls_the_api_once(): void
    {
        $this->nominatim([$this->place(1, 'Camden')]);
        $service = app(GeocodingService::class);

        $service->search('Camden', 'GB');
        $service->search('  camden ', 'gb');

        Http::assertSentCount(1);
    }

    public function test_it_returns_nothing_when_nominatim_fails_or_times_out(): void
    {
        $this->nominatim([], 503);
        $this->assertSame([], app(GeocodingService::class)->search('Camden', 'GB'));

        Cache::flush();
        config(['services.nominatim.enabled' => true]);
        Http::fake(['nominatim.openstreetmap.org/*' => fn () => throw new \Illuminate\Http\Client\ConnectionException('timeout')]);
        $this->assertSame([], app(GeocodingService::class)->search('Camden', 'GB'));
    }

    public function test_it_does_not_call_the_api_for_tiny_queries_or_when_switched_off(): void
    {
        $this->nominatim([$this->place(1, 'Camden')]);
        $this->assertSame([], app(GeocodingService::class)->search('Ca', 'GB'));

        config(['services.nominatim.enabled' => false]);
        $this->assertSame([], app(GeocodingService::class)->search('Camden', 'GB'));

        Http::assertNothingSent();
    }

    public function test_area_suggestions_come_from_our_table_first_then_nominatim_and_are_remembered(): void
    {
        $this->seed(CountrySeeder::class);
        $gb = Country::query()->where('code', 'GB')->firstOrFail();
        Area::query()->create(['country_id' => $gb->id, 'name' => 'Camden', 'latitude' => 51.539, 'longitude' => -0.1426]);
        $this->nominatim([$this->place(10, 'Camden Town', '51.539', '-0.142'), $this->place(11, 'Camden Lock', '51.541', '-0.146')]);

        $names = fn () => collect($this->getJson('/api/areas?country_code=GB&q=Camden')->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Camden', 'Camden Lock', 'Camden Town'], collect($names())->sort()->values()->all());
        $this->assertSame(3, Area::query()->count());          // the new places were remembered

        Http::fake(); // the next search must be answered without the internet
        $this->assertCount(3, $names());
    }

    public function test_area_suggestions_still_work_when_nominatim_is_down(): void
    {
        $this->seed(CountrySeeder::class);
        $gb = Country::query()->where('code', 'GB')->firstOrFail();
        Area::query()->create(['country_id' => $gb->id, 'name' => 'Camden', 'latitude' => 51.5, 'longitude' => -0.1]);
        $this->nominatim([], 500);

        $this->getJson('/api/areas?country_code=GB&q=Cam')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Camden');
    }

    public function test_registering_in_a_new_area_places_it_on_the_map(): void
    {
        $this->seed(CountrySeeder::class);
        $this->nominatim([$this->place(5, 'Hackney', '51.545', '-0.055')]);

        $this->postJson('/api/auth/register', [
            'name' => 'New Person', 'email' => 'new@example.test', 'password' => 'long-enough-pass',
            'country_code' => 'GB', 'area_name' => 'Hackney',
        ])->assertCreated()->assertJsonPath('data.area.latitude', 51.545);
    }

    // ---- REST Countries (v5) -----------------------------------------------------

    private function v5Row(string $code, string $name, string $region, array $calling, ?string $png = 'x'): array
    {
        return [
            'names' => ['common' => $name],
            'codes' => ['alpha_2' => $code],
            'region' => $region,
            'flag' => ['url_png' => $png === 'x' ? "https://flags.restcountries.com/v5/w640/".strtolower($code).'.png' : $png, 'url_svg' => "https://flags.restcountries.com/v5/svg/".strtolower($code).'.svg'],
            'calling_codes' => $calling,
        ];
    }

    private function v5Page(array $objects, bool $more = false): array
    {
        return ['data' => ['objects' => $objects, 'meta' => ['total' => count($objects), 'count' => count($objects), 'limit' => 100, 'offset' => 0, 'more' => $more]]];
    }

    private function restCountries(): array
    {
        return [
            $this->v5Row('MM', 'Myanmar', 'Asia', ['95']),
            $this->v5Row('US', 'United States', 'Americas', ['1']),
            ['names' => ['common' => ''], 'codes' => ['alpha_2' => 'XX']],            // unusable: no name
            ['names' => ['common' => 'Bad code'], 'codes' => ['alpha_2' => 'TOOLONG']], // unusable: bad code
        ];
    }

    private function withKey(): void
    {
        config(['services.restcountries.api_key' => 'test-key']);
    }

    public function test_the_country_sync_adds_countries_with_flags_and_calling_codes(): void
    {
        $this->withKey();
        Http::fake(['api.restcountries.com/*' => Http::response($this->v5Page($this->restCountries()))]);

        $this->artisan('countries:sync')->expectsOutputToContain('2 added, 0 updated')->assertSuccessful();

        $mm = Country::query()->where('code', 'MM')->firstOrFail();
        $this->assertSame('Myanmar', $mm->name);
        $this->assertSame('https://flags.restcountries.com/v5/w640/mm.png', $mm->flag_url);
        $this->assertSame('Asia', $mm->region);
        $this->assertSame('+95', $mm->calling_code);
        $this->assertNotNull($mm->synced_at);
        $this->assertSame('+1', Country::query()->where('code', 'US')->value('calling_code'));
        $this->assertSame(2, Country::query()->count());

        Http::assertSent(fn ($r) => $r->hasHeader('Authorization', 'Bearer test-key')
            && str_starts_with($r->url(), 'https://api.restcountries.com/countries/v5')
            && str_contains($r->url(), 'response_fields='));
    }

    public function test_the_country_sync_follows_pages(): void
    {
        $this->withKey();
        Http::fake(['api.restcountries.com/*' => Http::sequence()
            ->push($this->v5Page([$this->v5Row('MM', 'Myanmar', 'Asia', ['95'])], more: true))
            ->push($this->v5Page([$this->v5Row('SG', 'Singapore', 'Asia', ['65'])], more: false))]);

        $this->artisan('countries:sync')->expectsOutputToContain('2 added')->assertSuccessful();

        $this->assertSame(['MM', 'SG'], Country::query()->orderBy('code')->pluck('code')->all());
        Http::assertSentCount(2);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'offset=100'));
    }

    public function test_running_the_country_sync_again_updates_instead_of_duplicating(): void
    {
        $this->withKey();
        Http::fake(['api.restcountries.com/*' => Http::response($this->v5Page($this->restCountries()))]);
        $this->artisan('countries:sync')->assertSuccessful();

        Country::query()->where('code', 'MM')->update(['name' => 'Old name']);
        $this->artisan('countries:sync')->expectsOutputToContain('0 added, 2 updated')->assertSuccessful();

        $this->assertSame(2, Country::query()->count());
        $this->assertSame('Myanmar', Country::query()->where('code', 'MM')->value('name'));
    }

    public function test_without_an_api_key_the_sync_explains_and_changes_nothing(): void
    {
        $this->seed(CountrySeeder::class);
        $before = Country::query()->count();
        config(['services.restcountries.api_key' => '']);

        $this->artisan('countries:sync')->expectsOutputToContain('No REST Countries API key')->assertFailed();

        Http::assertNothingSent();
        $this->assertSame($before, Country::query()->count());
    }

    public function test_a_failed_country_sync_leaves_the_existing_countries_alone(): void
    {
        $this->withKey();
        $this->seed(CountrySeeder::class);
        $before = Country::query()->count();

        Http::fake(['api.restcountries.com/*' => Http::sequence()
            ->push('error', 500)
            ->push(['data' => null, 'errors' => [['message' => 'Unauthorized']]], 401)
            ->push(['data' => null, 'errors' => [['message' => 'Frozen']]], 403)
            ->push($this->v5Page([]))]);

        $this->artisan('countries:sync')->expectsOutputToContain('status 500')->assertFailed();
        $this->artisan('countries:sync')->expectsOutputToContain('API key was not accepted')->assertFailed();
        $this->artisan('countries:sync')->expectsOutputToContain('over its monthly limit')->assertFailed();
        $this->artisan('countries:sync')->expectsOutputToContain('no usable countries')->assertFailed();

        $this->assertSame($before, Country::query()->count());
    }

    public function test_an_unreachable_countries_api_leaves_the_existing_countries_alone(): void
    {
        $this->withKey();
        $this->seed(CountrySeeder::class);
        $before = Country::query()->count();

        Http::fake(['api.restcountries.com/*' => fn () => throw new \Illuminate\Http\Client\ConnectionException('timeout')]);
        $this->artisan('countries:sync')->expectsOutputToContain('Could not reach REST Countries')->assertFailed();

        $this->assertSame($before, Country::query()->count());
    }

    public function test_the_countries_endpoint_includes_flags(): void
    {
        $this->withKey();
        Http::fake(['api.restcountries.com/*' => Http::response($this->v5Page($this->restCountries()))]);
        $this->artisan('countries:sync')->assertSuccessful();

        $this->getJson('/api/countries')->assertOk()->assertJsonFragment(['code' => 'MM', 'flag_url' => 'https://flags.restcountries.com/v5/w640/mm.png']);
    }
}
