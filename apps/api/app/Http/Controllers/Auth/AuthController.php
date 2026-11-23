<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Country;
use App\Models\User;
use App\Services\CreditService;
use App\Services\GeocodingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Is this email free to register? (Used for the live check on the sign-up form.) */
    public function checkEmail(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->query('email')));

        return response()->json([
            'available' => $email !== '' && ! User::query()->where('email', $email)->exists(),
        ]);
    }

    public function register(RegisterRequest $request, CreditService $credits, GeocodingService $geocoder): JsonResponse
    {
        $data = $request->validated();

        // Find or place the area first (this may call Nominatim), so no database lock is held while we wait.
        $country = Country::query()->where('code', $data['country_code'])->firstOrFail();
        $area = $geocoder->resolveArea($country, $data['area_name']);

        $user = DB::transaction(function () use ($data, $credits, $area) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'area_id' => $area->id,
            ]);

            $credits->grantStarter($user);

            return $user;
        });

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($this->withProfile($user)))->response()->setStatusCode(201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $key = Str::lower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Too many attempts. Try again in {$seconds} seconds.",
            ])->status(429);
        }

        if (! Auth::guard('web')->attempt(['email' => Str::lower($credentials['email']), 'password' => $credentials['password']])) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => 'Email or password is incorrect']);
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();

        if (! $user->isActive()) {
            Auth::guard('web')->logout();

            return response()->json([
                'message' => 'This account has been suspended. Contact the TimeBank team for help.',
            ], 403);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        return (new UserResource($this->withProfile($user)))->response()->setStatusCode(200);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out']);
    }

    public function me(Request $request): JsonResponse
    {
        return (new UserResource($this->withProfile($request->user())))->response()->setStatusCode(200);
    }

    private function withProfile(User $user): User
    {
        return $user->load(['area.country', 'badges', 'availabilitySlots']);
    }
}
