<?php

namespace App\Http\Controllers;

use App\Models\Skill;
use App\Services\HelperSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Helpers who could take on a request for this skill, best match first. */
class SuggestedHelperController extends Controller
{
    public function index(Request $request, HelperSuggestionService $suggestions, int $id): JsonResponse
    {
        $skill = Skill::query()->listable()->findOrFail($id);

        $rows = collect($suggestions->suggest($skill, $request->user()))->map(function (array $row) {
            $helper = $row['user'];

            return [
                'id' => $helper->id,
                'name' => $helper->name,
                'area' => $helper->area?->name,
                'trust_score' => (float) $helper->trust_score,
                'distance_km' => $row['distance_km'],
                'score' => $row['score'],
                'reasons' => $row['reasons'],
            ];
        });

        return response()->json(['data' => $rows->values()]);
    }
}
