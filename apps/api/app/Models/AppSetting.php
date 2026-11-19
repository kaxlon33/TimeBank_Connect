<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Admin-editable key/value settings (value is JSON), e.g.
 *   starter_credit => 3
 *   matching       => { weights: {...}, max_distance_km, min_score, max_results }
 * Reads should go through SettingsService (cached); this model is the storage.
 */
class AppSetting extends Model
{
    public const CREATED_AT = null;

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'json',
            'updated_at' => 'datetime',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Uncached read helper; prefer SettingsService in request code. */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::query()->find($key);

        return $setting?->value ?? $default;
    }
}
