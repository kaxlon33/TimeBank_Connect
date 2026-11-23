<?php

use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\AdminMemberController;
use App\Http\Controllers\Admin\AdminModerationController;
use App\Http\Controllers\Admin\AdminSettingsController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\GeographyController;
use App\Http\Controllers\HelpRequestController;
use App\Http\Controllers\NearbyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SkillController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TimeBank Connect REST API  (all routes are prefixed with /api)
|--------------------------------------------------------------------------
| Auth is Sanctum SPA cookie auth: the SPA first calls GET /sanctum/csrf-cookie,
| then posts credentials; the session cookie identifies the member afterwards.
| Signed-in routes also cut off suspended members and note when a member was last active.
*/

Route::prefix('auth')->group(function () {
    Route::get('check-email', [AuthController::class, 'checkEmail'])->middleware('throttle:30,1');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:5,1');
    Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', 'active', 'track'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

// Reference data the sign-up form needs before anyone is signed in.
Route::get('countries', [GeographyController::class, 'countries']);
Route::get('areas', [GeographyController::class, 'areas'])->middleware('throttle:60,1');
Route::get('categories', [CategoryController::class, 'index']);

Route::middleware(['auth:sanctum', 'active', 'track'])->group(function () {
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::put('profile/availability', [ProfileController::class, 'availability']);

    Route::get('skills', [SkillController::class, 'index']);
    Route::post('skills', [SkillController::class, 'store'])->middleware('throttle:30,1');
    Route::get('skills/{skill}', [SkillController::class, 'show'])->whereNumber('skill');
    Route::put('skills/{id}', [SkillController::class, 'update'])->whereNumber('id');
    Route::delete('skills/{id}', [SkillController::class, 'destroy'])->whereNumber('id');
    Route::get('my/skills', [SkillController::class, 'mine']);

    Route::post('reports', [ReportController::class, 'store'])->middleware('throttle:20,1');

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

    // Admin area: every route here needs an admin account.
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('stats', [AdminStatsController::class, 'show']);
        Route::get('reports/count', [AdminStatsController::class, 'reportCount']);

        Route::get('members', [AdminMemberController::class, 'index']);
        Route::post('members/{id}/status', [AdminMemberController::class, 'updateStatus'])->whereNumber('id');

        Route::get('categories', [AdminCategoryController::class, 'index']);
        Route::post('categories', [AdminCategoryController::class, 'store']);
        Route::put('categories/{id}', [AdminCategoryController::class, 'update'])->whereNumber('id');
        Route::post('categories/{id}/toggle', [AdminCategoryController::class, 'toggle'])->whereNumber('id');

        Route::get('moderation', [AdminModerationController::class, 'index']);
        Route::post('moderation/{kind}/{id}/remove', [AdminModerationController::class, 'remove'])->whereIn('kind', ['skill', 'review'])->whereNumber('id');
        Route::post('moderation/{kind}/{id}/restore', [AdminModerationController::class, 'restore'])->whereIn('kind', ['skill', 'review'])->whereNumber('id');
        Route::post('reports/{id}/dismiss', [AdminModerationController::class, 'dismiss'])->whereNumber('id');

        Route::get('settings', [AdminSettingsController::class, 'show']);
        Route::put('settings', [AdminSettingsController::class, 'update']);
    });
});
