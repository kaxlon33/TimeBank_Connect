<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Country;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Talks to OpenStreetMap Nominatim (a third-party REST API) through the server, never from the browser.
 * Results are cached, calls are limited to one a second (the Nominatim policy), and any failure
 * quietly falls back to the areas we already have, so the app keeps working when it is down.
 */
class GeocodingService
{
    /**
     * Places matching the text inside one country.
     *
     * @return list<array{name:string, latitude:float, longitude:float, osm_place_id:int}>
     */
    public function search(string $query, string $countryCode, int $limit = 5): array
    {
        $query = trim($query);
        $countryCode = strtolower($countryCode);

        if (! config('services.nominatim.enabled') || mb_strlen($query) < 3 || strlen($countryCode) !== 2) {
            return [];
        }

        $key = 'geo:'.$countryCode.':'.md5(mb_strtolower($query)).':'.$limit;

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        try {
            // Nominatim allows one request a second: wait our turn rather than skip the lookup.
            $this->waitForTurn();

            $response = Http::baseUrl((string) config('services.nominatim.base_url'))
                ->withUserAgent((string) config('services.nominatim.user_agent'))
                ->acceptJson()
                ->timeout((int) config('services.nominatim.timeout'))
                ->get('/search', [
                    'q' => $query,
                    'countrycodes' => $countryCode,
                    'format' => 'jsonv2',
                    'addressdetails' => 1,
                    'limit' => $limit,
                    'accept-language' => 'en',
                ]);

            if (! $response->successful()) {
                Log::warning('Nominatim answered '.$response->status());

                return [];
            }

            $places = collect($response->json())
                ->filter(fn ($r) => isset($r['lat'], $r['lon'], $r['place_id']))
                ->map(fn ($r) => [
                    'name' => $this->placeName($r),
                    'latitude' => round((float) $r['lat'], 7),
                    'longitude' => round((float) $r['lon'], 7),
                    'osm_place_id' => (int) $r['place_id'],
                ])
                ->filter(fn ($p) => $p['name'] !== '')
                ->unique(fn ($p) => mb_strtolower($p['name']))
                ->values()
                ->all();

            Cache::put($key, $places, (int) config('services.nominatim.cache_seconds'));

            return $places;
        } catch (\Throwable $e) {
            Log::warning('Nominatim lookup failed: '.$e->getMessage());

            return [];
        }
    }

    /**
     * The member's area as a stored row with coordinates. Reuses an existing area of the same name,
     * otherwise creates one and fills in its position from Nominatim (when reachable).
     */
    public function resolveArea(Country $country, string $name, ?User $creator = null): Area
    {
        $name = trim($name);

        $area = Area::query()->firstOrCreate(
            ['country_id' => $country->id, 'name_normalized' => Area::normalizeName($name)],
            ['name' => $name, 'created_by' => $creator?->id],
        );

        if ($area->latitude === null || $area->longitude === null) {
            $match = $this->search($name, $country->code, 1)[0] ?? null;
            if ($match) {
                $area->forceFill([
                    'latitude' => $match['latitude'],
                    'longitude' => $match['longitude'],
                    'osm_place_id' => $match['osm_place_id'],
                ])->save();
            }
        }

        return $area;
    }

    /** Spaces calls out so the server never sends Nominatim more than one request per interval. */
    private function waitForTurn(): void
    {
        $interval = (int) config('services.nominatim.min_interval_ms');
        if ($interval <= 0) {
            return;
        }

        $lock = Cache::lock('nominatim-turn', 10);
        $lock->block(8); // throws if the line is too long, and the caller falls back to known areas

        try {
            $wait = (float) Cache::get('nominatim-last-call', 0) + $interval / 1000 - microtime(true);
            if ($wait > 0) {
                usleep((int) ($wait * 1_000_000));
            }
            Cache::put('nominatim-last-call', microtime(true), 60);
        } finally {
            $lock->release();
        }
    }

    /** A short place name: the suburb, town or city rather than the full address line. */
    private function placeName(array $r): string
    {
        $addr = $r['address'] ?? [];
        foreach (['suburb', 'neighbourhood', 'city_district', 'town', 'village', 'city', 'municipality', 'county', 'state'] as $field) {
            if (! empty($addr[$field]) && mb_stripos((string) ($r['name'] ?? ''), $addr[$field]) !== false) {
                return (string) $addr[$field];
            }
        }

        $name = trim((string) ($r['name'] ?? ''));

        return $name !== '' ? $name : trim(explode(',', (string) ($r['display_name'] ?? ''))[0]);
    }
}
