<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A member suspended while signed in is cut off on their very next request,
 * not only the next time they try to log in.
 */
class EnsureMemberIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->isActive()) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            return response()->json(['message' => 'This account has been suspended. Contact the TimeBank team for help.'], 403);
        }

        return $next($request);
    }
}
