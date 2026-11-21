<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Expects skill, requester and provider (with area.country and stats) and reviews to be loaded.
 *
 * @mixin \App\Models\HelpRequest
 */
class HelpRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;

        return [
            'id' => $this->id,
            'skill' => ['id' => $this->skill->id, 'title' => $this->skill->title],
            'requester' => new UserSummaryResource($this->requester),
            'provider' => new UserSummaryResource($this->provider),
            'hours' => (float) $this->hours,
            'credits' => (float) $this->credits,
            'message' => $this->message ?? '',
            'status' => $this->status->value,
            'proposed_at' => $this->proposed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'responded_at' => $this->responded_at?->toIso8601String(),
            'provider_done_at' => $this->provider_done_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancel_reason' => $this->cancel_reason,
            'reviewed_by_me' => $this->reviews->contains(fn ($r) => $r->reviewer_id === $viewerId),
        ];
    }
}
