<?php

namespace App\Http\Resources;

use App\Enums\ReviewStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * The full profile of a member, as shown to that member (and to admins).
 * Public views of other members use a slimmer summary resource.
 *
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $reviews = $this->reviewsReceived()->where('status', ReviewStatus::Visible->value);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'status' => $this->status->value,
            'bio' => $this->bio ?? '',
            'avatar_url' => $this->avatarUrl(),
            'area' => $this->area ? new AreaResource($this->area->loadMissing('country')) : null,
            'credit_balance' => (float) $this->credit_balance,
            'trust_score' => (float) $this->trust_score,
            'completed_sessions' => $this->completedSessionsCount(),
            'rating_avg' => ($avg = $reviews->avg('rating')) !== null ? round((float) $avg, 2) : null,
            'rating_count' => $reviews->count(),
            'badges' => $this->badges->map(fn ($b) => [
                'code' => $b->code,
                'name' => $b->name,
                'description' => $b->description,
                'awarded_at' => $b->pivot->awarded_at,
            ])->values(),
            'availability' => $this->availabilitySlots
                ->sortBy(['weekday', 'start_time'])
                ->map(fn ($s) => [
                    'weekday' => (int) $s->weekday,
                    'start_time' => substr((string) $s->start_time, 0, 5),
                    'end_time' => substr((string) $s->end_time, 0, 5),
                ])->values(),
            'created_at' => $this->created_at?->toIso8601String(),
            'suspended_reason' => $this->suspended_reason,
        ];
    }
}
