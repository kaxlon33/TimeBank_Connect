<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Enums\SkillStatus;
use App\Enums\UserStatus;
use App\Http\Requests\SkillRequest;
use App\Http\Resources\PublicProfileResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\SkillResource;
use App\Models\Skill;
use App\Models\User;
use App\Services\ImageStore;
use App\Services\UserStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SkillController extends Controller
{
    private const MAX_SKILLS_PER_MEMBER = 10;

    public function __construct(private readonly UserStatsService $stats, private readonly ImageStore $images) {}

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

    // ---- Writing -----------------------------------------------------------

    public function store(SkillRequest $request): JsonResponse
    {
        $user = $request->user();

        $count = Skill::query()->where('user_id', $user->id)->where('status', '!=', SkillStatus::Removed->value)->count();
        if ($count >= self::MAX_SKILLS_PER_MEMBER) {
            throw ValidationException::withMessages(['title' => 'You can offer up to '.self::MAX_SKILLS_PER_MEMBER.' skills. Remove one first.']);
        }

        $data = $request->validated();
        $skill = new Skill(['category_id' => $data['category_id'], 'title' => $data['title'], 'description' => $data['description']]);
        $skill->user_id = $user->id;
        $skill->status = SkillStatus::from($data['status'] ?? 'active');
        if (! empty($data['image_url'])) {
            $skill->image_path = $this->images->storeDataUrl($data['image_url'], 'skills', 'image_url');
        }
        $skill->save();

        return $this->one($skill, 201);
    }

    public function update(SkillRequest $request, int $id): JsonResponse
    {
        $skill = $this->ownedBy($request, $id);
        $data = $request->validated();

        $skill->fill(['category_id' => $data['category_id'], 'title' => $data['title'], 'description' => $data['description']]);
        if (isset($data['status'])) {
            $skill->status = SkillStatus::from($data['status']);
        }

        $oldImage = null;
        if (array_key_exists('image_url', $data)) {
            $oldImage = $skill->image_path;
            $skill->image_path = $data['image_url'] ? $this->images->storeDataUrl($data['image_url'], 'skills', 'image_url') : null;
        }
        $skill->save();
        if ($oldImage && $oldImage !== $skill->image_path) {
            $this->images->delete($oldImage);
        }

        return $this->one($skill);
    }

    /** Removes a post that nobody has asked for. One with requests is kept for the record: hide it instead. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $skill = $this->ownedBy($request, $id);

        if ($skill->helpRequests()->exists()) {
            abort(409, 'Neighbours have already asked for this skill, so it cannot be deleted. Hide it instead.');
        }

        $image = $skill->image_path;
        $skill->delete();
        $this->images->delete($image);

        return response()->json(['message' => 'Skill deleted']);
    }

    private function ownedBy(Request $request, int $id): Skill
    {
        $skill = Skill::query()->findOrFail($id);
        abort_unless($skill->user_id === $request->user()->id, 403, 'This is not your skill.');
        abort_if($skill->status === SkillStatus::Removed, 404, 'This skill is no longer available.');

        return $skill;
    }

    private function one(Skill $skill, int $status = 200): JsonResponse
    {
        $skill->load(['category', 'user.area.country']);
        $this->stats->attach([$skill->user]);

        return (new SkillResource($skill))->response()->setStatusCode($status);
    }
}
