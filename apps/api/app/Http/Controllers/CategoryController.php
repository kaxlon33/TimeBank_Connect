<?php

namespace App\Http\Controllers;

use App\Enums\SkillStatus;
use App\Models\SkillCategory;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /** Active categories with the number of live skills in each. */
    public function index(): JsonResponse
    {
        $categories = SkillCategory::query()
            ->active()
            ->ordered()
            ->withCount(['skills' => fn ($q) => $q->where('status', SkillStatus::Active->value)])
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'is_active' => (bool) $c->is_active,
                'skills_count' => (int) $c->skills_count,
            ]);

        return response()->json(['data' => $categories]);
    }
}
