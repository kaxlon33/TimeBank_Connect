<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Remembers when a member last used the app (at most once every five minutes) for the admin "inactive" view. */
class TrackLastActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->last_active_at || $user->last_active_at->lt(now()->subMinutes(5)))) {
            // A plain query update: this is not an edit of the member, so updated_at stays put.
            User::query()->whereKey($user->id)->toBase()->update(['last_active_at' => now()]);
        }

        return $next($request);
    }
}
