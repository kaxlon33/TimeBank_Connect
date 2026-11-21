<?php

namespace App\Http\Controllers;

use App\Enums\SkillStatus;
use App\Http\Resources\UserSummaryResource;
use App\Models\Area;
use App\Models\User;
use App\Services\UserStatsService;
use App\Support\Geo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NearbyController extends Controller
{
    /**
     * Helpers around a point, nearest first.
     * Areas inside the radius are found with an indexed bounding box plus Haversine in SQL
     * (Area::near); members in those areas are then placed with a small privacy offset and
     * filtered by the exact distance.
     */
    public function index(Request $request, UserStatsService $stats): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:200'],
        ]);

        $lat = (float) $data['lat'];
        $lng = (float) $data['lng'];
        $radius = (float) ($data['radius_km'] ?? 10);

        // A little wider than asked, because the privacy offset can move a pin up to ~0.5 km.
        $areaIds = Area::query()->near($lat, $lng, $radius + 1)->pluck('areas.id');

        $members = User::query()
            ->active()->members()
            ->where('id', '!=', $request->user()->id)
            ->whereIn('area_id', $areaIds)
            ->with([
                'area.country',
                'availabilitySlots',
                'skills' => fn ($q) => $q->where('status', SkillStatus::Active->value)->orderBy('id'),
            ])
            ->get();

        $stats->attach($members);

        $helpers = $members->map(function (User $u) use ($lat, $lng) {
            [$dLat, $dLng] = Geo::privacyOffset($u->id);
            $pinLat = (float) $u->area->latitude + $dLat;
            $pinLng = (float) $u->area->longitude + $dLng;

            return [
                'user' => (new UserSummaryResource($u))->resolve(),
                'distance_km' => round(Geo::distanceKm($lat, $lng, $pinLat, $pinLng), 2),
                'lat' => round($pinLat, 5),
                'lng' => round($pinLng, 5),
                'available_now' => $this->isFreeNow($u),
                'skills' => $u->skills->map(fn ($s) => ['id' => $s->id, 'title' => $s->title])->values(),
            ];
        })
            ->filter(fn ($h) => $h['distance_km'] <= $radius && count($h['skills']) > 0)
            ->sortBy('distance_km')
            ->values();

        return response()->json(['data' => $helpers]);
    }

    /** True when one of the member's weekly slots covers the current time. */
    private function isFreeNow(User $u): bool
    {
        $now = now();
        $hhmm = $now->format('H:i:s');

        return $u->availabilitySlots->contains(
            fn ($s) => (int) $s->weekday === $now->dayOfWeek && (string) $s->start_time <= $hhmm && $hhmm < (string) $s->end_time,
        );
    }
}
