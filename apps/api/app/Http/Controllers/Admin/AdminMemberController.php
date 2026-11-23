<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AreaResource;
use App\Models\User;
use App\Services\AuditService;
use App\Services\UserStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminMemberController extends Controller
{
    /** Members with the numbers an admin needs. Search matches name, email and area. */
    public function index(Request $request, UserStatsService $stats): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $term = trim((string) ($data['q'] ?? ''));
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        $members = User::query()
            ->with('area.country')
            ->where('role', UserRole::Member->value)
            ->when($term !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhereHas('area', fn ($a) => $a->where('name', 'like', $like))))
            ->orderBy('name')
            ->limit(200)
            ->get();

        $stats->attach($members);

        return response()->json(['data' => $members->map(fn (User $u) => $this->present($u))->values()]);
    }

    /** Suspend (with a reason) or reactivate a member. */
    public function updateStatus(Request $request, int $id, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended'])],
            'reason' => ['nullable', 'string', 'max:500', 'required_if:status,suspended', 'min:3'],
        ]);

        $admin = $request->user();

        $member = DB::transaction(function () use ($id, $data, $admin, $audit) {
            $member = User::query()->lockForUpdate()->findOrFail($id);

            abort_if($member->isAdmin(), 403, 'Admin accounts cannot be suspended here.');
            abort_if($member->id === $admin->id, 403, 'You cannot suspend yourself.');

            $suspend = $data['status'] === 'suspended';
            if ($suspend && ! $member->isActive()) {
                abort(409, 'This member is already suspended.');
            }
            if (! $suspend && $member->isActive()) {
                abort(409, 'This member is not suspended.');
            }

            $member->forceFill([
                'status' => $suspend ? UserStatus::Suspended->value : UserStatus::Active->value,
                'suspended_reason' => $suspend ? $data['reason'] : null,
                'suspended_at' => $suspend ? now() : null,
            ])->save();

            if ($suspend) {
                DB::table('sessions')->where('user_id', $member->id)->delete(); // signed out everywhere, now
            }

            $audit->record($admin, $suspend ? 'member.suspend' : 'member.reactivate', 'user', $member->id, $member->name, $data['reason'] ?? null);

            return $member;
        });

        return response()->json(['data' => ['id' => $member->id, 'status' => $member->status->value]]);
    }

    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'avatar_url' => $u->avatar_path ? Storage::disk('public')->url($u->avatar_path) : null,
            'last_active_at' => ($u->last_active_at ?? $u->created_at)?->toIso8601String(),
            'area' => $u->area ? (new AreaResource($u->area))->resolve() : null,
            'status' => $u->status->value,
            'credit_balance' => (float) $u->credit_balance,
            'trust_score' => (float) $u->trust_score,
            'completed_sessions' => (int) $u->getAttribute('completed_sessions'),
            'joined_at' => $u->created_at?->toIso8601String(),
            'suspended_reason' => $u->suspended_reason,
        ];
    }
}
