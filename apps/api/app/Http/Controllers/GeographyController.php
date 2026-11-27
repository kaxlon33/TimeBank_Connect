<?php

namespace App\Http\Controllers;

use App\Http\Resources\AreaResource;
use App\Models\Area;
use App\Models\Country;
use App\Services\GeocodingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Countries and area suggestions for the sign-up and profile forms. */
class GeographyController extends Controller
{
    public function countries(): JsonResponse
    {
        $countries = Country::query()->active()->orderBy('name')->get(['id', 'code', 'name', 'flag_url', 'calling_code']);

        return response()->json(['data' => $countries]);
    }

    /**
     * Autocomplete for an area name inside one country. Areas we already know come first; if there
     * are fewer than five, OpenStreetMap Nominatim fills the rest and the places are remembered,
     * so the same search is answered from our own table next time.
     */
    public function areas(Request $request, GeocodingService $geocoder): AnonymousResourceCollection
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'country_code' => ['nullable', 'string', 'size:2'],
        ]);

        $term = trim((string) ($data['q'] ?? ''));
        $code = strtoupper((string) ($data['country_code'] ?? ''));

        $areas = Area::query()
            ->with('country')
            ->whereHas('country', fn ($c) => $c->active())
            ->when($code !== '', fn ($q) => $q->whereHas('country', fn ($c) => $c->where('code', $code)))
            ->when($term !== '', fn ($q) => $q->nameStartsWith($term))
            ->orderBy('name')
            ->limit(5)
            ->get();

        if ($areas->count() < 5 && $code !== '' && mb_strlen($term) >= 3) {
            $country = Country::query()->active()->where('code', $code)->first();

            if ($country) {
                foreach ($geocoder->search($term, $code, 5 - $areas->count()) as $place) {
                    $area = Area::query()->firstOrCreate(
                        ['country_id' => $country->id, 'name_normalized' => Area::normalizeName($place['name'])],
                        [
                            'name' => $place['name'],
                            'latitude' => $place['latitude'],
                            'longitude' => $place['longitude'],
                            'osm_place_id' => $place['osm_place_id'],
                        ],
                    )->setRelation('country', $country);

                    if (! $areas->contains('id', $area->id) && $areas->count() < 5) {
                        $areas->push($area);
                    }
                }
            }
        }

        return AreaResource::collection($areas->values());
    }
}
