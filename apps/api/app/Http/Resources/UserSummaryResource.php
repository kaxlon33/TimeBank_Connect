<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * What other members may see about someone: no email, no credit balance.
 * Expects UserStatsService::attach() to have been called for list views.
 *
 * @mixin \App\Models\User
 */
class UserSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar_url' => $this->avatarUrl(),
            'area' => $this->relationLoaded('area') && $this->area ? new AreaResource($this->area->loadMissing('country')) : null,
            'trust_score' => (float) $this->trust_score,
            'completed_sessions' => (int) ($this->getAttribute('completed_sessions') ?? 0),
            'rating_avg' => $this->getAttribute('rating_avg'),
            'rating_count' => (int) ($this->getAttribute('rating_count') ?? 0),
        ];
    }
}
