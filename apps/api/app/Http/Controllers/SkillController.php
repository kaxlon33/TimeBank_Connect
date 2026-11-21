<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Enums\SkillStatus;
use App\Enums\UserStatus;
use App\Http\Resources\PublicProfileResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\SkillResource;
use App\Models\Skill;
use App\Models\User;
use App\Services\UserStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    public function __construct(private readonly UserStatsService $stats) {}

    /** Browse and search live skills from other members, most trusted helpers first. */
    public function index(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:80'],
        ]);

        $term = trim((string) ($data['q'] ?? ''));
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        $skills = Skill::query()
            ->listable()
            ->with(['category', 'user.area.country'])
            ->where('skills.user_id', '!=', $request->user()->id)
            ->when(! empty($data['category']), fn ($q) => $q->whereHas('category', fn ($c) => $c->where('slug', $data['category'])))
            ->when($term !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('skills.title', 'like', $like)
                ->orWhere('skills.description', 'like', $like)
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)
                    ->orWhereHas('area', fn ($a) => $a->where('name', 'like', $like)))))
            ->orderByDesc(User::query()->select('trust_score')->whereColumn('users.id', 'skills.user_id'))
            ->orderByDesc('skills.id')
            ->limit(60)
            ->get();

        $this->stats->attach($skills->pluck('user'));

        return SkillResource::collection($skills);
    }

    /** One skill with its helper's public profile and reviews. */
    public function show(Skill $skill): JsonResponse
    {
        $helper = User::query()->with(['area.country', 'badges', 'availabilitySlots'])->findOrFail($skill->user_id);

        if ($skill->status === SkillStatus::Removed || $helper->status !== UserStatus::Active) {
            abort(404, 'This skill is no longer available.');
        }

        $skill->load(['category', 'user.area.country']);
        $reviews = $helper->reviewsReceived()
            ->where('status', ReviewStatus::Visible->value)
            ->with(['reviewer:id,name', 'reviewee:id,name'])
            ->latest()
            ->limit(50)
            ->get();

        $this->stats->attach([$helper, $skill->user]);

        return response()->json(['data' => [
            'skill' => new SkillResource($skill),
            'helper' => new PublicProfileResource($helper),
            'reviews' => ReviewResource::collection($reviews),
        ]]);
    }

    /** The signed-in member's own skills, including hidden ones. */
    public function mine(Request $request)
    {
        $skills = Skill::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SkillStatus::Removed->value)
            ->with(['category', 'user.area.country'])
            ->latest('id')
            ->get();

        $this->stats->attach($skills->pluck('user'));

        return SkillResource::collection($skills);
    }
}
