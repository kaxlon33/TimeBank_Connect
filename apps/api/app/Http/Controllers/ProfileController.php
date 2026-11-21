<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** The signed-in member's profile and the reviews written about them. */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['area.country', 'badges', 'availabilitySlots']);

        $reviews = $user->reviewsReceived()
            ->where('status', ReviewStatus::Visible->value)
            ->with(['reviewer:id,name', 'reviewee:id,name'])
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['data' => [
            'user' => new UserResource($user),
            'reviews' => ReviewResource::collection($reviews),
        ]]);
    }
}
