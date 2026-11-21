<?php

namespace App\Http\Controllers;

use App\Http\Resources\AreaResource;
use App\Models\Area;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Countries and area suggestions for the sign-up and profile forms. */
class GeographyController extends Controller
{
    public function countries(): JsonResponse
    {
        $countries = Country::query()->orderBy('name')->get(['id', 'code', 'name']);

        return response()->json(['data' => $countries]);
    }

    /** Autocomplete: areas in a country whose name starts with the typed text. */
    public function areas(Request $request): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'country_code' => ['nullable', 'string', 'size:2'],
        ]);

        $areas = Area::query()
            ->with('country')
            ->when(! empty($data['country_code']), fn ($q) => $q->whereHas('country', fn ($c) => $c->where('code', strtoupper($data['country_code']))))
            ->when(trim((string) ($data['q'] ?? '')) !== '', fn ($q) => $q->nameStartsWith(trim($data['q'])))
            ->orderBy('name')
            ->limit(5)
            ->get();

        return AreaResource::collection($areas);
    }
}
