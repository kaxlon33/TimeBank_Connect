<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Area extends Model
{
    protected $fillable = [
        'country_id',
        'name',
        'name_normalized',
        'latitude',
        'longitude',
        'osm_place_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'osm_place_id' => 'integer',
        ];
    }

    /** The de-duplication key stored in name_normalized (unique per country). */
    public static function normalizeName(string $name): string
    {
        return Str::of($name)->squish()->ascii()->lower()->limit(120, '')->toString();
    }

    protected static function booted(): void
    {
        static::saving(function (Area $area) {
            if ($area->isDirty('name') || $area->name_normalized === null) {
                $area->name_normalized = static::normalizeName($area->name);
            }
        });
    }

    // ---- Relationships ---------------------------------------------------

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ---- Scopes ----------------------------------------------------------

    /**
     * Areas within $radiusKm of a point, nearest first, with a `distance_km` column.
     * Step 1: bounding box on (latitude, longitude) so the index is used.
     * Step 2: Haversine distance in SQL for exact filtering and ordering (design 4.6).
     * MySQL/MariaDB only (SQLite has no trig functions by default).
     */
    public function scopeNear(Builder $query, float $lat, float $lng, float $radiusKm): Builder
    {
        $latDelta = $radiusKm / 111.045;
        $lngDelta = $radiusKm / (111.045 * max(cos(deg2rad($lat)), 0.00001));

        $haversine = '(6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(areas.latitude))'
            .' * COS(RADIANS(areas.longitude) - RADIANS(?))'
            .' + SIN(RADIANS(?)) * SIN(RADIANS(areas.latitude)))))';

        return $query
            ->select('areas.*')
            ->selectRaw("$haversine AS distance_km", [$lat, $lng, $lat])
            ->whereNotNull('areas.latitude')
            ->whereBetween('areas.latitude', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('areas.longitude', [$lng - $lngDelta, $lng + $lngDelta])
            ->whereRaw("$haversine <= ?", [$lat, $lng, $lat, $radiusKm])
            ->orderBy('distance_km');
    }

    /** Autocomplete: names starting with $term (uses the (country_id, name) index). */
    public function scopeNameStartsWith(Builder $query, string $term): Builder
    {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);

        return $query->where('name', 'like', $escaped.'%');
    }
}
