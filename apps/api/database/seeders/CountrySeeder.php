<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Loads the committed REST Countries snapshot (ADR-0008 fallback). No network calls.
 * Safe to re-run: upserts on the ISO alpha-2 code. synced_at stays null because
 * this data did not come from a live sync (`countries:sync` sets it).
 */
class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/countries.json');
        $rows = json_decode((string) file_get_contents($path), true);

        if (! is_array($rows)) {
            throw new RuntimeException("Invalid country snapshot: {$path}");
        }

        $now = now();
        $records = array_map(fn (array $c) => [
            'code' => strtoupper($c['code']),
            'name' => $c['name'],
            'flag_url' => $c['flag_url'] ?? null,
            'region' => $c['region'] ?? null,
            'calling_code' => $c['calling_code'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $rows);

        DB::table('countries')->upsert(
            $records,
            ['code'],
            ['name', 'flag_url', 'region', 'calling_code', 'updated_at'],
        );
    }
}
