<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'help_request_id' => $this->help_request_id,
            'reviewer' => ['id' => $this->reviewer->id, 'name' => $this->reviewer->name],
            'reviewee' => ['id' => $this->reviewee->id, 'name' => $this->reviewee->name],
            'rating' => (int) $this->rating,
            'comment' => $this->comment ?? '',
            'status' => $this->status->value,
            'report_count' => 0,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
