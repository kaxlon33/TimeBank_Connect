<?php

namespace App\Models;

use App\Enums\TransactionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Append-only credit ledger row (design 4.3, ADR-0003).
 *
 * Rows are written only by CreditService (inside a locked transaction) and never
 * updated or deleted: the model refuses both. There is no updated_at column.
 * Never build a ledger row from request input: amounts are calculated on the server.
 */
class CreditTransaction extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'transfer_uuid',
        'user_id',
        'counterparty_id',
        'help_request_id',
        'type',
        'amount',
        'balance_after',
        'idempotency_key',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('Credit ledger rows are append-only and cannot be updated.');
        });

        static::deleting(function () {
            throw new LogicException('Credit ledger rows are append-only and cannot be deleted.');
        });
    }

    // ---- Relationships ---------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function counterparty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counterparty_id');
    }

    public function helpRequest(): BelongsTo
    {
        return $this->belongsTo(HelpRequest::class);
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeOfType(Builder $query, TransactionType|string|null $type): Builder
    {
        if ($type === null || $type === '') {
            return $query;
        }

        return $query->where('type', $type instanceof TransactionType ? $type->value : $type);
    }

    /** Newest first using the (user_id, id) index. */
    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('id');
    }
}
