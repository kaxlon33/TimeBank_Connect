<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Always answers the same way, so nobody can use this form to find out
     * which emails have an account.
     */
    public function sendLink(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'string', 'email']]);

        Password::sendResetLink(['email' => Str::lower($data['email'])]);

        return response()->json(['email' => $data['email']]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)],
        ]);

        $status = Password::reset(
            ['email' => Str::lower($data['email']), 'password' => $data['password'], 'token' => $data['token']],
            function ($user, string $password) {
                $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'This reset link has expired. Ask for a new one.']);
        }

        return response()->json(['message' => 'Password updated']);
    }
}
