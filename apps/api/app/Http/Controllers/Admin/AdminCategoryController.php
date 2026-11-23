<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SkillStatus;
use App\Http\Controllers\Controller;
use App\Models\SkillCategory;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminCategoryController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    /** Every category, including switched-off ones. */
    public function index(): JsonResponse
    {
        $categories = SkillCategory::query()->ordered()
            ->withCount(['skills' => fn ($q) => $q->where('status', '!=', SkillStatus::Removed->value)])
            ->get();

        return response()->json(['data' => $categories->map(fn ($c) => $this->present($c))->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $name = $this->validName($request);
        $this->mustBeNew($name);

        $category = DB::transaction(function () use ($name, $request) {
            $category = new SkillCategory(['name' => $name]);
            $category->forceFill([
                'name' => $name,
                'slug' => $this->uniqueSlug($name),
                'is_active' => true,
                'sort_order' => ((int) SkillCategory::query()->max('sort_order')) + 1,
            ])->save();
            $this->audit->record($request->user(), 'category.create', 'category', $category->id, $category->name);

            return $category;
        });

        return response()->json(['data' => $this->present($category->loadCount('skills'))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = SkillCategory::query()->findOrFail($id);
        $name = $this->validName($request);
        $this->mustBeNew($name, $category->id);

        $old = $category->name;
        $category->forceFill(['name' => $name, 'slug' => $this->uniqueSlug($name, $category->id)])->save();
        $this->audit->record($request->user(), 'category.rename', 'category', $category->id, $name, null, ['from' => $old]);

        return response()->json(['data' => $this->present($category->loadCount('skills'))]);
    }

    /** Switch a category off (hidden from new posts) or back on. Existing skills are untouched. */
    public function toggle(Request $request, int $id): JsonResponse
    {
        $category = SkillCategory::query()->findOrFail($id);
        $category->forceFill(['is_active' => ! $category->is_active])->save();
        $this->audit->record($request->user(), $category->is_active ? 'category.enable' : 'category.disable', 'category', $category->id, $category->name);

        return response()->json(['data' => $this->present($category->loadCount('skills'))]);
    }

    private function validName(Request $request): string
    {
        return trim($request->validate(['name' => ['required', 'string', 'min:2', 'max:80']])['name']);
    }

    private function mustBeNew(string $name, ?int $exceptId = null): void
    {
        $taken = SkillCategory::query()->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))->exists();

        if ($taken) {
            throw ValidationException::withMessages(['name' => 'A category with this name already exists.']);
        }
    }

    private function uniqueSlug(string $name, ?int $exceptId = null): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        for ($i = 2; SkillCategory::query()->where('slug', $slug)->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    private function present(SkillCategory $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'is_active' => (bool) $c->is_active,
            'skills_count' => (int) ($c->skills_count ?? 0),
        ];
    }
}
