<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = [
        'code',
        'name',
        'flag_url',
        'region',
        'calling_code',
        'synced_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'synced_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
}
