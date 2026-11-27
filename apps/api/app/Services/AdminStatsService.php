<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\CreditTransaction;
use App\Models\HelpRequest;
use App\Models\Report;
use App\Models\Skill;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** The numbers on the admin overview, worked out in a handful of aggregate queries. */
class AdminStatsService
{
    public function __construct(private readonly CreditService $credits) {}

    /** @return array<string,mixed> */
    public function overview(): array
    {
        $members = User::query()->where('role', UserRole::Member->value);

        return [
            'total_members' => (clone $members)->count(),
            'active_members' => (clone $members)->where('status', UserStatus::Active->value)->count(),
            'suspended_members' => (clone $members)->where('status', UserStatus::Suspended->value)->count(),
            'completed_sessions' => HelpRequest::query()->where('status', RequestStatus::Completed->value)->count(),
            'credits_in_circulation' => round((float) User::query()->sum('credit_balance'), 2),
            'starter_credits_issued' => round((float) CreditTransaction::query()->where('type', TransactionType::StarterGrant->value)->sum('amount'), 2),
            'popular_skills' => $this->popularSkills(),
            'sessions_by_week' => $this->sessionsByWeek(),
            'open_reports' => $this->openReports(),
            'ledger_balanced' => $this->credits->reconcile()['ok'],
        ];
    }

    /** Items (not individual reports) waiting for a decision. */
    public function openReports(): int
    {
        return Report::query()->open()->distinct()->count(DB::raw("CONCAT(target_type, ':', target_id)"));
    }

    /** @return list<array{title:string, category:string, requests:int}> */
    private function popularSkills(): array
    {
        return Skill::query()->with('category:id,name')->withCount('helpRequests')
            ->having('help_requests_count', '>', 0)
            ->orderByDesc('help_requests_count')->orderBy('id')->limit(5)->get()
            ->map(fn (Skill $s) => ['title' => $s->title, 'category' => $s->category->name, 'requests' => (int) $s->help_requests_count])
            ->all();
    }

    /** Completed sessions in each of the last six weeks (weeks start on Monday). */
    private function sessionsByWeek(): array
    {
        $thisWeek = CarbonImmutable::now()->startOfWeek();
        $out = [];

        for ($i = 5; $i >= 0; $i--) {
            $start = $thisWeek->subWeeks($i);
            $count = HelpRequest::query()->where('status', RequestStatus::Completed->value)
                ->whereBetween('completed_at', [$start, $start->endOfWeek()])->count();
            $out[] = ['week' => $i === 0 ? 'This wk' : "{$i} wk", 'sessions' => $count];
        }

        return $out;
    }
}
