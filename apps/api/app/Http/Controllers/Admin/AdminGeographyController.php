<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Country;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Admin tools for the country list and the area list that members choose from. */
class AdminGeographyController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    /** Every country, including switched-off ones. */
    public function countries(): JsonResponse
    {
        $countries = Country::query()->withCount('areas')->orderBy('name')->get();

        return response()->json(['data' => $countries->map(fn (Country $c) => $this->presentCountry($c))->values()]);
    }

    /** Switch a country off (hidden from sign-up and its areas hidden) or back on. Nobody is moved or removed. */
    public function toggleCountry(Request $request, int $id): JsonResponse
    {
        $country = Country::query()->withCount('areas')->findOrFail($id);
        $country->forceFill(['is_active' => ! $country->is_active])->save();

        $this->audit->record(
            $request->user(),
            $country->is_active ? 'country.enable' : 'country.disable',
            'country',
            $country->id,
            $country->name,
        );

        return response()->json(['data' => $this->presentCountry($country)]);
    }

    /** Areas in name order, optionally for one country or matching a search. */
    public function areas(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'country_code' => ['nullable', 'string', 'size:2'],
        ]);

        $term = trim((string) ($data['q'] ?? ''));
        $code = strtoupper((string) ($data['country_code'] ?? ''));

        $areas = Area::query()
            ->with('country')
            ->withCount('users')
            ->when($code !== '', fn ($q) => $q->whereHas('country', fn ($c) => $c->where('code', $code)))
            ->when($term !== '', fn ($q) => $q->where('name', 'like', '%'.addcslashes($term, '\\%_').'%'))
            ->orderBy('name')
            ->limit(100)
            ->get();

        return response()->json(['data' => $areas->map(fn (Area $a) => $this->presentArea($a))->values()]);
    }

    /** Rename an area. The name must stay unique inside its country. */
    public function renameArea(Request $request, int $id): JsonResponse
    {
        $area = Area::query()->with('country')->withCount('users')->findOrFail($id);
        $name = trim($request->validate(['name' => ['required', 'string', 'min:2', 'max:120']])['name']);

        $normalized = Area::normalizeName($name);
        $taken = Area::query()
            ->where('country_id', $area->country_id)
            ->where('name_normalized', $normalized)
            ->where('id', '!=', $area->id)
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages(['name' => 'Another area in this country already has this name.']);
        }

        $old = $area->name;
        DB::transaction(function () use ($area, $name, $request, $old) {
            $area->forceFill(['name' => $name])->save();
            $this->audit->record($request->user(), 'area.rename', 'area', $area->id, $name, null, ['from' => $old]);
        });

        return response()->json(['data' => $this->presentArea($area->refresh()->load('country')->loadCount('users'))]);
    }

    /** Delete an area nobody lives in. An area with members is kept so their profiles still work. */
    public function destroyArea(Request $request, int $id): JsonResponse
    {
        $area = Area::query()->withCount('users')->findOrFail($id);

        if ($area->users_count > 0) {
            abort(409, 'Members live in this area, so it cannot be deleted. Rename it instead.');
        }

        $name = $area->name;
        DB::transaction(function () use ($area, $request, $name) {
            $area->delete();
            $this->audit->record($request->user(), 'area.delete', 'area', $area->id, $name);
        });

        return response()->json(['message' => 'Area deleted']);
    }

    private function presentCountry(Country $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'flag_url' => $c->flag_url,
            'is_active' => (bool) $c->is_active,
            'areas_count' => (int) ($c->areas_count ?? 0),
        ];
    }

    private function presentArea(Area $a): array
    {
        return [
            'id' => $a->id,
            'name' => $a->name,
            'country_code' => $a->country?->code,
            'country_name' => $a->country?->name,
            'members_count' => (int) ($a->users_count ?? 0),
        ];
    }
}
