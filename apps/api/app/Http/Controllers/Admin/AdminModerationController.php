<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\SkillResource;
use App\Models\AuditLog;
use App\Models\Report;
use App\Models\Review;
use App\Models\Skill;
use App\Services\ModerationService;
use App\Services\UserStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminModerationController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    /** The queue of reported items, every skill and review, and the admin log. */
    public function index(UserStatsService $stats): JsonResponse
    {
        $skills = Skill::query()->with(['category', 'user.area.country'])
            ->withCount(['reports as open_reports_count' => fn ($q) => $q->where('status', 'open')])
            ->latest('id')->limit(200)->get();
        $stats->attach($skills->pluck('user'));

        $reviews = Review::query()->with(['reviewer:id,name', 'reviewee:id,name'])
            ->withCount(['reports as open_reports_count' => fn ($q) => $q->where('status', 'open')])
            ->latest('id')->limit(200)->get();

        $audit = AuditLog::query()->with('actor:id,name')->latest('id')->limit(50)->get()
            ->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'actor' => $a->actor?->name ?? 'Admin',
                'target' => $a->meta['label'] ?? $a->target_type,
                'reason' => $a->meta['reason'] ?? '',
                'created_at' => $a->created_at?->toIso8601String(),
            ])->values();

        return response()->json(['data' => [
            'reported' => $this->queue(),
            'skills' => SkillResource::collection($skills)->resolve(),
            'reviews' => ReviewResource::collection($reviews)->resolve(),
            'audit' => $audit,
        ]]);
    }

    public function remove(Request $request, string $kind, int $id): JsonResponse
    {
        $reason = $this->reason($request);
        $kind === 'skill'
            ? $this->moderation->removeSkill($request->user(), $id, $reason)
            : $this->moderation->removeReview($request->user(), $id, $reason);

        return response()->json(['message' => 'Removed']);
    }

    public function restore(Request $request, string $kind, int $id): JsonResponse
    {
        $reason = $this->reason($request);
        $kind === 'skill'
            ? $this->moderation->restoreSkill($request->user(), $id, $reason)
            : $this->moderation->restoreReview($request->user(), $id, $reason);

        return response()->json(['message' => 'Restored']);
    }

    /** Keep the content and close the report. */
    public function dismiss(Request $request, int $reportId): JsonResponse
    {
        $this->moderation->dismissReport($request->user(), $reportId);

        return response()->json(['message' => 'Report dismissed']);
    }

    private function reason(Request $request): string
    {
        return trim($request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']])['reason']);
    }

    /** Open reports grouped by the thing reported, oldest first. */
    private function queue(): array
    {
        $groups = Report::query()->open()->orderBy('id')->get()->groupBy(fn (Report $r) => $r->target_type.':'.$r->target_id);

        $skills = Skill::query()->with('user:id,name')->whereIn('id', $groups->flatten()->where('target_type', 'skill')->pluck('target_id')->unique())->get()->keyBy('id');
        $reviews = Review::query()->with(['reviewer:id,name', 'reviewee:id,name'])->whereIn('id', $groups->flatten()->where('target_type', 'review')->pluck('target_id')->unique())->get()->keyBy('id');

        $items = [];
        foreach ($groups as $reports) {
            /** @var Report $first */
            $first = $reports->first();
            $last = $reports->last();

            if ($first->target_type === 'skill') {
                $skill = $skills->get($first->target_id);
                if (! $skill) {
                    continue;
                }
                [$title, $excerpt, $author] = [$skill->title, Str::limit($skill->description, 120), $skill->user->name];
            } else {
                $review = $reviews->get($first->target_id);
                if (! $review) {
                    continue;
                }
                [$title, $excerpt, $author] = ['Review of '.$review->reviewee->name, Str::limit((string) $review->comment, 120), $review->reviewer->name];
            }

            $items[] = [
                'id' => $first->id,
                'kind' => $first->target_type,
                'target_id' => $first->target_id,
                'title' => $title,
                'excerpt' => $excerpt,
                'author' => $author,
                'reason' => $last->reason,
                'reports' => $reports->count(),
                'created_at' => $first->created_at?->toIso8601String(),
            ];
        }

        return $items;
    }
}
