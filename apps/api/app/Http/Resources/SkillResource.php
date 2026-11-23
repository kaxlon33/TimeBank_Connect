<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\Skill */
class SkillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            'status' => $this->status->value,
            'user' => new UserSummaryResource($this->user),
            'created_at' => $this->created_at?->toIso8601String(),
            'report_count' => (int) ($this->open_reports_count ?? 0),
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
        ];
    }
}
