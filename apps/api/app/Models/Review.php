<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * help_request_id, reviewer_id and reviewee_id are set by the controller/service from the
 * route and the authenticated user; status and removed_* only by moderation code.
 */
class Review extends Model
{
    /** Same default as the table, so a new review is complete without a reload. */
    protected $attributes = ['status' => 'visible'];

    protected $fillable = [
        'rating',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'status' => ReviewStatus::class,
            'removed_at' => 'datetime',
        ];
    }

    public function helpRequest(): BelongsTo
    {
        return $this->belongsTo(HelpRequest::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function reviewee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewee_id');
    }

    public function remover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', ReviewStatus::Visible->value);
    }
}
