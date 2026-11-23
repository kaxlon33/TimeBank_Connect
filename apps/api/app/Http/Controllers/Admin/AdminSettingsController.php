<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->current()]);
    }

    public function update(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'starter_credit' => ['required', 'numeric', 'min:0', 'max:20', 'multiple_of:0.5'],
            'matching.weights.skill' => ['required', 'integer', 'between:0,100'],
            'matching.weights.location' => ['required', 'integer', 'between:0,100'],
            'matching.weights.availability' => ['required', 'integer', 'between:0,100'],
            'matching.weights.reputation' => ['required', 'integer', 'between:0,100'],
            'matching.max_distance_km' => ['required', 'integer', 'between:1,200'],
            'matching.min_score' => ['required', 'integer', 'between:0,100'],
            'matching.max_results' => ['required', 'integer', 'between:1,50'],
        ]);

        $weights = $data['matching']['weights'];
        if (array_sum($weights) !== 100) {
            throw ValidationException::withMessages(['weights' => 'Matching weights must add up to 100.']);
        }

        $before = $this->current();

        DB::transaction(function () use ($data, $request) {
            foreach (['starter_credit' => (float) $data['starter_credit'], 'matching' => $data['matching']] as $key => $value) {
                $setting = AppSetting::query()->firstOrNew(['key' => $key]);
                $setting->forceFill(['value' => $value, 'updated_by' => $request->user()->id])->save();
            }
        });

        $audit->record($request->user(), 'settings.update', 'setting', null, 'Settings', null, ['before' => $before, 'after' => $this->current()]);

        return response()->json(['data' => $this->current()]);
    }

    /** @return array{starter_credit: float, matching: array} */
    private function current(): array
    {
        return [
            'starter_credit' => (float) AppSetting::getValue('starter_credit', 3),
            'matching' => AppSetting::getValue('matching', [
                'weights' => ['skill' => 40, 'location' => 25, 'availability' => 15, 'reputation' => 20],
                'max_distance_km' => 25, 'min_score' => 30, 'max_results' => 10,
            ]),
        ];
    }
}
