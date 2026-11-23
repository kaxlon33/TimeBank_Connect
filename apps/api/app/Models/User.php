<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\RequestStatus;
use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * A member or an admin.
 *
 * Not mass assignable on purpose: role, status, suspended_*, credit_balance, trust_score.
 * credit_balance is a cached copy of SUM(credit_transactions.amount) and must only be
 * changed by CreditService inside a locked transaction (ADR-0003).
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /** Same defaults as the table, so a freshly created model is complete without a reload. */
    protected $attributes = [
        'role' => 'member',
        'status' => 'active',
        'credit_balance' => 0,
        'trust_score' => 61.25,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'bio',
        'area_id',
        'avatar_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'suspended_at' => 'datetime',
            'last_active_at' => 'datetime',
            'credit_balance' => 'decimal:2',
            'trust_score' => 'decimal:2',
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function skills(): HasMany
    {
        return $this->hasMany(Skill::class);
    }

    public function availabilitySlots(): HasMany
    {
        return $this->hasMany(AvailabilitySlot::class);
    }

    /** Requests this user sent (as requester). */
    public function sentHelpRequests(): HasMany
    {
        return $this->hasMany(HelpRequest::class, 'requester_id');
    }

    /** Requests this user received (as provider/helper). */
    public function receivedHelpRequests(): HasMany
    {
        return $this->hasMany(HelpRequest::class, 'provider_id');
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function reviewsWritten(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function reviewsReceived(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'user_badges')->withPivot('awarded_at');
    }

    /** Admin actions performed by this user. */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'actor_id');
    }

    // ---- Scopes ----------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', UserStatus::Active->value);
    }

    public function scopeMembers(Builder $query): Builder
    {
        return $query->where('role', UserRole::Member->value);
    }

    // ---- Helpers ---------------------------------------------------------

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** Number of completed sessions in either role (used by trust score and badges). */
    public function completedSessionsCount(): int
    {
        return HelpRequest::query()
            ->where('status', RequestStatus::Completed->value)
            ->where(fn (Builder $q) => $q->where('requester_id', $this->id)->orWhere('provider_id', $this->id))
            ->count();
    }

    /** Visible reviews about this user. */
    public function visibleReviewsReceived(): HasMany
    {
        return $this->reviewsReceived()->where('status', ReviewStatus::Visible->value);
    }
}
