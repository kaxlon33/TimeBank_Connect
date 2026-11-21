<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\GeographyController;
use App\Http\Controllers\HelpRequestController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\NearbyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SkillController;
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

// Reference data the sign-up form needs before anyone is signed in.
Route::get('countries', [GeographyController::class, 'countries']);
Route::get('areas', [GeographyController::class, 'areas'])->middleware('throttle:60,1');
Route::get('categories', [CategoryController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('profile', [ProfileController::class, 'show']);

    Route::get('skills', [SkillController::class, 'index']);
    Route::get('skills/{skill}', [SkillController::class, 'show'])->whereNumber('skill');
    Route::get('my/skills', [SkillController::class, 'mine']);

    Route::get('nearby', [NearbyController::class, 'index']);

    Route::get('help-requests', [HelpRequestController::class, 'index']);
    Route::post('help-requests', [HelpRequestController::class, 'store'])->middleware('throttle:20,1');
    Route::prefix('help-requests/{id}')->whereNumber('id')->group(function () {
        Route::get('/', [HelpRequestController::class, 'show']);
        Route::post('accept', [HelpRequestController::class, 'accept']);
        Route::post('decline', [HelpRequestController::class, 'decline']);
        Route::post('mark-done', [HelpRequestController::class, 'markDone']);
        Route::post('cancel', [HelpRequestController::class, 'cancel']);
        Route::post('complete', [HelpRequestController::class, 'complete']);
        Route::post('reviews', [ReviewController::class, 'store']);
    });

    Route::get('credits/transactions', [CreditController::class, 'transactions']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/unread-all', [NotificationController::class, 'markAllUnread']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/{id}/unread', [NotificationController::class, 'markUnread']);
});
