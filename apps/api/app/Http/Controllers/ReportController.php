<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Enums\SkillStatus;
use App\Models\Report;
use App\Models\Review;
use App\Models\Skill;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    /** A member reports a skill post or a review to the moderators. One report per person per item. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['skill', 'review'])],
            'target_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:3', 'max:300'],
        ]);

        $user = $request->user();

        if ($data['kind'] === 'skill') {
            $skill = Skill::query()->where('status', '!=', SkillStatus::Removed->value)->find($data['target_id']);
            abort_if(! $skill, 404, 'We could not find that skill.');
            abort_if($skill->user_id === $user->id, 403, 'You cannot report your own skill.');
        } else {
            $review = Review::query()->where('status', ReviewStatus::Visible->value)->find($data['target_id']);
            abort_if(! $review, 404, 'We could not find that review.');
            abort_if($review->reviewer_id === $user->id, 403, 'You cannot report your own review.');
        }

        try {
            $report = new Report(['reason' => trim($data['reason'])]);
            $report->forceFill(['reporter_id' => $user->id, 'target_type' => $data['kind'], 'target_id' => $data['target_id']])->save();
        } catch (UniqueConstraintViolationException) {
            abort(409, 'You have already reported this. The moderators will take a look.');
        }

        return response()->json(['message' => 'Thank you. A moderator will review this.'], 201);
    }
}
