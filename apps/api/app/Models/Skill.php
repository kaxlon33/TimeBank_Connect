<?php

namespace App\Models;

use App\Enums\SkillStatus;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A skill a member offers. user_id is set from the authenticated user, and
 * status / removed_* are changed only by moderation code, so none are fillable.
 */
class Skill extends Model
{
    /** Same default as the table, so a new skill is complete without a reload. */
    protected $attributes = ['status' => 'active'];

    protected $fillable = [
        'category_id',
        'title',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'status' => SkillStatus::class,
            'removed_at' => 'datetime',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    /** Member reports about this skill post. */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'target_id')->where('target_type', 'skill');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(SkillCategory::class, 'category_id');
    }

    public function helpRequests(): HasMany
    {
        return $this->hasMany(HelpRequest::class);
    }

    public function remover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    // ---- Scopes ----------------------------------------------------------

    /** Publicly listable: active skill posted by an active member. */
    public function scopeListable(Builder $query): Builder
    {
        return $query
            ->where('skills.status', SkillStatus::Active->value)
            ->whereHas('user', fn (Builder $q) => $q->where('status', UserStatus::Active->value));
    }

    /** Simple LIKE search on title and description (live search). */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        return $query->where(fn (Builder $q) => $q
            ->where('skills.title', 'like', $like)
            ->orWhere('skills.description', 'like', $like));
    }

    public function scopeInCategory(Builder $query, ?int $categoryId): Builder
    {
        return $categoryId ? $query->where('skills.category_id', $categoryId) : $query;
    }
}
