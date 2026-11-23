<?php

namespace Database\Seeders;

use App\Models\Report;
use App\Models\Review;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo reports for the admin moderation queue: a spam skill post reported four times and a review
 * reported twice. Only runs when there are no reports yet.
 */
class ReportSeeder extends Seeder
{
    public function run(): void
    {
        if (Report::query()->exists()) {
            return;
        }

        $admin = User::query()->where('role', 'admin')->first();

        $spam = Skill::query()->where('title', 'Cheap followers fast!!!')->first();
        if ($spam) {
            foreach ([2, 3, 4, 5] as $i => $reporterId) {
                $this->report($reporterId, 'skill', $spam->id, ['Spam: not a skill exchange.', 'Looks like an advert.', 'Spam', 'Not a real skill'][$i], 'open', now()->subDays(6 - $i));
            }
        }

        $review = Review::query()->where('comment', 'like', 'Rude personal remark%')->first();
        if ($review) {
            // That review is already removed in the demo data, so its reports are closed.
            $status = $review->status->value === 'removed' ? 'actioned' : 'open';
            foreach ([$review->reviewee_id, 3] as $reporterId) {
                $this->report($reporterId, 'review', $review->id, 'Personal attack', $status, now()->subDays(16), $admin?->id);
            }
        }
    }

    private function report(int $reporterId, string $type, int $targetId, string $reason, string $status, $at, ?int $resolvedBy = null): void
    {
        if (! User::query()->whereKey($reporterId)->exists()) {
            return;
        }

        $report = new Report(['reason' => $reason]);
        $report->forceFill([
            'reporter_id' => $reporterId,
            'target_type' => $type,
            'target_id' => $targetId,
            'status' => $status,
            'resolved_by' => $status === 'open' ? null : $resolvedBy,
            'resolved_at' => $status === 'open' ? null : $at,
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
    }
}
