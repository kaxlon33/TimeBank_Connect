<?php

namespace App\Console\Commands;

use App\Models\Country;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Loads country names, flags, regions and calling codes from the REST Countries API (a third-party
 * REST API, version 5). It needs a free API key (RESTCOUNTRIES_API_KEY in .env, from restcountries.com).
 *
 * Safe to run again: countries are matched on their two-letter code and updated, never duplicated.
 * If there is no key or the API cannot be reached, the countries we already have are left alone and
 * the app keeps working with them.
 */
class SyncCountries extends Command
{
    protected $signature = 'countries:sync';

    protected $description = 'Update the country list from the REST Countries API (needs RESTCOUNTRIES_API_KEY)';

    /** Safety stop: 5 pages of up to 100 is more than the world has countries. */
    private const MAX_PAGES = 5;

    public function handle(): int
    {
        $key = (string) config('services.restcountries.api_key');
        if ($key === '') {
            $this->warn('No REST Countries API key is set, so nothing was changed.');
            $this->line('Create a free account at https://restcountries.com/sign-up, then add RESTCOUNTRIES_API_KEY=your_key to apps/api/.env.');
            $this->line('Until then the app keeps using the countries it already has.');

            return self::FAILURE;
        }

        $rows = [];
        $limit = (int) config('services.restcountries.page_size');

        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            try {
                $response = Http::baseUrl((string) config('services.restcountries.base_url'))
                    ->withToken($key)
                    ->acceptJson()
                    ->timeout((int) config('services.restcountries.timeout'))
                    ->get('/', [
                        'limit' => $limit,
                        'offset' => $page * $limit,
                        'response_fields' => 'names.common,codes.alpha_2,region,flag.url_png,flag.url_svg,calling_codes',
                    ]);
            } catch (\Throwable $e) {
                $this->error('Could not reach REST Countries: '.$e->getMessage());

                return self::FAILURE;
            }

            if (! $response->successful()) {
                return $this->explainFailure($response);
            }

            $data = (array) $response->json('data');
            $rows = array_merge($rows, (array) ($data['objects'] ?? []));

            if (empty($data['meta']['more'])) {
                break;
            }
        }

        $created = $updated = 0;

        foreach ($rows as $row) {
            $code = strtoupper((string) ($row['codes']['alpha_2'] ?? ''));
            $name = trim((string) ($row['names']['common'] ?? ''));
            if (strlen($code) !== 2 || $name === '') {
                continue;
            }

            $calling = (array) ($row['calling_codes'] ?? []);

            $country = Country::query()->firstOrNew(['code' => $code]);
            $isNew = ! $country->exists;
            $country->forceFill([
                'name' => $name,
                'flag_url' => $row['flag']['url_png'] ?? $row['flag']['url_svg'] ?? null,
                'region' => $row['region'] ?? null,
                'calling_code' => $calling ? '+'.ltrim((string) $calling[0], '+') : null,
                'synced_at' => now(),
            ])->save();

            $isNew ? $created++ : $updated++;
        }

        if ($created + $updated === 0) {
            $this->warn('The API returned no usable countries. Nothing was changed.');

            return self::FAILURE;
        }

        $this->info("Countries synced: {$created} added, {$updated} updated.");

        return self::SUCCESS;
    }

    private function explainFailure(Response $response): int
    {
        $detail = match ($response->status()) {
            401 => 'The API key was not accepted. Check RESTCOUNTRIES_API_KEY.',
            403 => 'The account is blocked or over its monthly limit.',
            429 => 'Too many requests. Try again in a minute.',
            default => 'It answered with status '.$response->status().'.',
        };

        $this->error("REST Countries refused the request. {$detail} Nothing was changed.");

        return self::FAILURE;
    }
}
