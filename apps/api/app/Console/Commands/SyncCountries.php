<?php

namespace App\Console\Commands;

use App\Models\Country;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Loads country names, flags, regions and calling codes from the REST Countries API (a third-party
 * REST API). Safe to run again: countries are matched on their two-letter code and updated, never
 * duplicated. If the API cannot be reached the countries we already have are left alone.
 */
class SyncCountries extends Command
{
    protected $signature = 'countries:sync';

    protected $description = 'Update the country list from the REST Countries API';

    public function handle(): int
    {
        try {
            $response = Http::baseUrl((string) config('services.restcountries.base_url'))
                ->acceptJson()
                ->timeout((int) config('services.restcountries.timeout'))
                ->retry(2, 1000, throw: false)
                ->get('/all', ['fields' => 'cca2,name,flags,region,idd']);
        } catch (\Throwable $e) {
            $this->error('Could not reach REST Countries: '.$e->getMessage());

            return self::FAILURE;
        }

        if (! $response->successful()) {
            $this->error('REST Countries answered '.$response->status().'. Nothing was changed.');

            return self::FAILURE;
        }

        $created = $updated = 0;

        foreach ((array) $response->json() as $row) {
            $code = strtoupper((string) ($row['cca2'] ?? ''));
            $name = trim((string) ($row['name']['common'] ?? ''));
            if (strlen($code) !== 2 || $name === '') {
                continue;
            }

            $suffixes = (array) ($row['idd']['suffixes'] ?? []);
            $calling = ($row['idd']['root'] ?? '') !== ''
                ? $row['idd']['root'].(count($suffixes) === 1 ? $suffixes[0] : '')
                : null;

            $country = Country::query()->firstOrNew(['code' => $code]);
            $isNew = ! $country->exists;
            $country->forceFill([
                'name' => $name,
                'flag_url' => $row['flags']['png'] ?? $row['flags']['svg'] ?? null,
                'region' => $row['region'] ?? null,
                'calling_code' => $calling,
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
}
