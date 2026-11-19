<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A request for help and its life cycle (see App\Enums\RequestStatus).
 *
 * Only the request body is fillable. requester_id, provider_id, credits, status and
 * every *_at / cancel field are set by HelpRequestService, never from client input.
 */
class HelpRequest extends Model
{
    protected $fillable = [
        'skill_id',
        'message',
        'hours',
        'proposed_at',
    ];

    protected function casts(): array
    {
        return [
            'hours' => 'decimal:2',
            'credits' => 'decimal:2',
            'status' => RequestStatus::class,
            'proposed_at' => 'datetime',
            'responded_at' => 'datetime',
            'provider_done_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    // ---- Scopes ----------------------------------------------------------

    /** Requests where the user is requester or provider. */
    public function scopeInvolving(Builder $query, int $userId): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->where('requester_id', $userId)
            ->orWhere('provider_id', $userId));
    }

    public function scopeWithStatus(Builder $query, RequestStatus|string|null $status): Builder
    {
        if ($status === null || $status === '') {
            return $query;
        }

        return $query->where('status', $status instanceof RequestStatus ? $status->value : $status);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', array_map(fn (RequestStatus $s) => $s->value, RequestStatus::open()));
    }

    // ---- Helpers ---------------------------------------------------------

    public function isParticipant(User $user): bool
    {
        return $user->id === $this->requester_id || $user->id === $this->provider_id;
    }
}
