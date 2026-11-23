<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminStatsService;
use Illuminate\Http\JsonResponse;

class AdminStatsController extends Controller
{
    public function show(AdminStatsService $stats): JsonResponse
    {
        return response()->json(['data' => $stats->overview()]);
    }

    /** Just the number the sidebar badge needs. */
    public function reportCount(AdminStatsService $stats): JsonResponse
    {
        return response()->json(['open' => $stats->openReports()]);
    }
}
