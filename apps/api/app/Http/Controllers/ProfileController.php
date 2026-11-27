<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Http\Requests\UpdateAvailabilityRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use App\Models\Country;
use App\Services\GeocodingService;
use App\Services\ImageStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

    /** Name, bio, area and picture. The area is matched or created and placed on the map. */
    public function update(UpdateProfileRequest $request, GeocodingService $geocoder, ImageStore $images): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $country = Country::query()->where('code', $data['country_code'])->firstOrFail();
        $area = $geocoder->resolveArea($country, $data['area_name'], $user);

        $oldAvatar = null;
        $user->fill(['name' => $data['name'], 'bio' => $data['bio'] ?? null, 'area_id' => $area->id]);

        if (array_key_exists('avatar_url', $data)) {
            $oldAvatar = $user->avatar_path;
            $user->avatar_path = $this->avatarFor($data['avatar_url'], $images);
        }

        $user->save();
        if ($oldAvatar && $oldAvatar !== $user->avatar_path && ! str_starts_with($oldAvatar, 'preset:')) {
            $images->delete($oldAvatar);
        }

        return $this->me($user);
    }

    /** The friendly characters a member can pick instead of a photo. Must match the web app's list. */
    private const PRESETS = ['pick1', 'pick2', 'pick3', 'pick4', 'pick5', 'pick6', 'sophie', 'kyaw'];

    /** Null clears the picture, "preset:<name>" keeps a chosen character, a data URL stores a photo. */
    private function avatarFor(?string $value, ImageStore $images): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (str_starts_with($value, 'preset:')) {
            $name = substr($value, 7);
            if (! in_array($name, self::PRESETS, true)) {
                throw ValidationException::withMessages(['avatar_url' => 'Choose one of the friendly characters.']);
            }

            return 'preset:'.$name;
        }

        return $images->storeDataUrl($value, 'avatars', 'avatar_url');
    }

    /** Replaces the whole weekly availability. */
    public function availability(UpdateAvailabilityRequest $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user) {
            $user->availabilitySlots()->delete();
            foreach ($request->validated('slots') as $slot) {
                $user->availabilitySlots()->create([
                    'weekday' => $slot['weekday'],
                    'start_time' => $slot['start_time'].':00',
                    'end_time' => $slot['end_time'].':00',
                ]);
            }
        });

        return $this->me($user);
    }

    private function me($user): JsonResponse
    {
        $user->refresh()->load(['area.country', 'badges', 'availabilitySlots']);

        return (new UserResource($user))->response()->setStatusCode(200);
    }
}
