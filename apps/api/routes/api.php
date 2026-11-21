<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TimeBank Connect REST API  (all routes are prefixed with /api)
|--------------------------------------------------------------------------
| Auth is Sanctum SPA cookie auth: the SPA first calls GET /sanctum/csrf-cookie,
| then posts credentials; the session cookie identifies the member afterwards.
*/

Route::prefix('auth')->group(function () {
    Route::get('check-email', [AuthController::class, 'checkEmail'])->middleware('throttle:30,1');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:5,1');
    Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});
