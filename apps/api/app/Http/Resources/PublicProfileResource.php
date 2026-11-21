<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * A member's public profile (shown on a skill page): the summary plus bio, badges and
 * weekly availability. Never includes email or credit balance.
 *
 * @mixin \App\Models\User
 */
class PublicProfileResource extends UserSummaryResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'role' => $this->role->value,
            'status' => $this->status->value,
            'bio' => $this->bio ?? '',
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
        ];
    }
}
