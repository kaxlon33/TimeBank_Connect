<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Enums\ReviewStatus;
use App\Enums\SkillStatus;
use App\Models\HelpRequest;
use App\Models\Report;
use App\Models\Review;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * What an admin can do about reported content. Every action is one transaction and is written to the audit log.
 */
class ModerationService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly TrustScoreService $trust,
    ) {}

    public function removeSkill(User $admin, int $id, string $reason): Skill
    {
        return DB::transaction(function () use ($admin, $id, $reason) {
            $skill = Skill::query()->lockForUpdate()->findOrFail($id);
            if ($skill->status === SkillStatus::Removed) {
                abort(409, 'This skill was already removed.');
            }

            $skill->forceFill([
                'status' => SkillStatus::Removed->value,
                'removed_by' => $admin->id,
                'removed_reason' => $reason,
                'removed_at' => now(),
            ])->save();

            // Nobody should be left waiting on a skill that no longer exists.
            HelpRequest::query()->with('requester')->where('skill_id', $skill->id)
                ->where('status', RequestStatus::Pending->value)->get()
                ->each(function (HelpRequest $r) use ($admin, $skill) {
                    $r->forceFill([
                        'status' => RequestStatus::Cancelled->value,
                        'cancelled_at' => now(),
                        'cancelled_by' => $admin->id,
                        'cancel_reason' => 'The skill was removed by a moderator.',
                    ])->save();
                    $this->notifications->send($r->requester, 'request_cancelled', 'A request was cancelled', "“{$skill->title}” is no longer available.", '/requests?tab=sent');
                });

            $this->closeReports('skill', $skill->id, 'actioned', $admin);
            $this->audit->record($admin, 'skill.remove', 'skill', $skill->id, $skill->title, $reason);

            return $skill;
        });
    }

    public function restoreSkill(User $admin, int $id, string $reason): Skill
    {
        return DB::transaction(function () use ($admin, $id, $reason) {
            $skill = Skill::query()->lockForUpdate()->findOrFail($id);
            if ($skill->status !== SkillStatus::Removed) {
                abort(409, 'This skill is not removed.');
            }

            $skill->forceFill(['status' => SkillStatus::Active->value, 'removed_by' => null, 'removed_reason' => null, 'removed_at' => null])->save();
            $this->audit->record($admin, 'skill.restore', 'skill', $skill->id, $skill->title, $reason);

            return $skill;
        });
    }

    public function removeReview(User $admin, int $id, string $reason): Review
    {
        return DB::transaction(function () use ($admin, $id, $reason) {
            $review = Review::query()->with('reviewer', 'reviewee')->lockForUpdate()->findOrFail($id);
            if ($review->status === ReviewStatus::Removed) {
                abort(409, 'This review was already removed.');
            }

            $review->forceFill([
                'status' => ReviewStatus::Removed->value,
                'removed_by' => $admin->id,
                'removed_reason' => $reason,
                'removed_at' => now(),
            ])->save();

            $this->trust->recalculate($review->reviewee); // a removed review no longer counts
            $this->closeReports('review', $review->id, 'actioned', $admin);
            $this->audit->record($admin, 'review.remove', 'review', $review->id, 'Review of '.$review->reviewee->name, $reason);

            return $review;
        });
    }

    public function restoreReview(User $admin, int $id, string $reason): Review
    {
        return DB::transaction(function () use ($admin, $id, $reason) {
            $review = Review::query()->with('reviewee')->lockForUpdate()->findOrFail($id);
            if ($review->status !== ReviewStatus::Removed) {
                abort(409, 'This review is not removed.');
            }

            $review->forceFill(['status' => ReviewStatus::Visible->value, 'removed_by' => null, 'removed_reason' => null, 'removed_at' => null])->save();
            $this->trust->recalculate($review->reviewee);
            $this->audit->record($admin, 'review.restore', 'review', $review->id, 'Review of '.$review->reviewee->name, $reason);

            return $review;
        });
    }

    /** Keeps the content and closes every open report about it. */
    public function dismissReport(User $admin, int $reportId): void
    {
        DB::transaction(function () use ($admin, $reportId) {
            $report = Report::query()->open()->lockForUpdate()->findOrFail($reportId);

            $label = $report->target_type === 'skill'
                ? (Skill::query()->find($report->target_id)?->title ?? 'Skill')
                : 'Review of '.(Review::query()->with('reviewee')->find($report->target_id)?->reviewee?->name ?? 'member');

            $this->closeReports($report->target_type, $report->target_id, 'dismissed', $admin);
            $this->audit->record($admin, 'report.dismiss', $report->target_type, $report->target_id, $label, 'Reviewed and kept: no rule broken.');
        });
    }

    private function closeReports(string $type, int $id, string $status, User $admin): void
    {
        Report::query()->open()->where('target_type', $type)->where('target_id', $id)
            ->update(['status' => $status, 'resolved_by' => $admin->id, 'resolved_at' => now()]);
    }
}
