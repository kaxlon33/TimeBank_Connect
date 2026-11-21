<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\HelpRequest;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The life cycle of a help request (see App\Enums\RequestStatus):
 *
 *   pending -> accepted | declined | cancelled
 *   accepted -> awaiting_confirmation (helper marks the session done) | cancelled
 *   awaiting_confirmation -> completed (requester confirms, credits move) | cancelled
 *
 * Every change locks the request row first, so two clicks or two tabs cannot both win,
 * and a request that has already moved on answers 409.
 */
class HelpRequestService
{
    public function __construct(
        private readonly CreditService $credits,
        private readonly NotificationService $notifications,
        private readonly TrustScoreService $trust,
        private readonly BadgeService $badges,
    ) {}

    /** @param array{skill_id:int, hours:float|int|string, message?:?string, proposed_at?:?string} $data */
    public function create(User $requester, array $data): HelpRequest
    {
        $skill = Skill::query()->listable()->find($data['skill_id']);
        if (! $skill) {
            abort(404, 'This skill is no longer available.');
        }
        if ($skill->user_id === $requester->id) {
            throw ValidationException::withMessages(['skill_id' => 'You cannot request your own skill.']);
        }

        $hours = round((float) $data['hours'], 2);
        $credits = round($hours * (float) config('timebank.credits_per_hour'), 2);

        return DB::transaction(function () use ($requester, $skill, $data, $hours, $credits) {
            // Credits only move at the end, but a member cannot ask for more time than they could pay for.
            $payer = User::query()->whereKey($requester->id)->lockForUpdate()->firstOrFail();
            if ((float) $payer->credit_balance < $credits) {
                throw ValidationException::withMessages(['hours' => "You need {$credits} credits but have ".(float) $payer->credit_balance.'.']);
            }

            $alreadyOpen = HelpRequest::query()->open()
                ->where('requester_id', $requester->id)->where('skill_id', $skill->id)->exists();
            if ($alreadyOpen) {
                throw ValidationException::withMessages(['skill_id' => 'You already have an open request for this skill.']);
            }

            $request = new HelpRequest([
                'skill_id' => $skill->id,
                'message' => $data['message'] ?? null,
                'hours' => $hours,
                'proposed_at' => $data['proposed_at'] ?? null,
            ]);
            $request->forceFill([
                'requester_id' => $requester->id,
                'provider_id' => $skill->user_id,
                'credits' => $credits,
                'status' => RequestStatus::Pending->value,
            ])->save();

            $this->notifications->send(
                $skill->user,
                'request_received',
                "New request from {$requester->name}",
                $this->summary($skill->title, $hours),
                '/requests?tab=received',
            );

            return $request;
        });
    }

    public function accept(int $id, User $actor): HelpRequest
    {
        return DB::transaction(function () use ($id, $actor) {
            $r = $this->lock($id);
            $this->mustBeProvider($r, $actor);
            $this->mustBe($r, [RequestStatus::Pending]);

            $r->forceFill(['status' => RequestStatus::Accepted->value, 'responded_at' => now()])->save();
            $this->notifications->send($r->requester, 'request_accepted', "{$this->first($actor)} accepted your request", $this->summary($r->skill->title, $r->hours), '/requests?tab=sent');

            return $r;
        });
    }

    public function decline(int $id, User $actor): HelpRequest
    {
        return DB::transaction(function () use ($id, $actor) {
            $r = $this->lock($id);
            $this->mustBeProvider($r, $actor);
            $this->mustBe($r, [RequestStatus::Pending]);

            $r->forceFill(['status' => RequestStatus::Declined->value, 'responded_at' => now()])->save();
            $this->notifications->send($r->requester, 'request_declined', "{$this->first($actor)} declined your request", $this->summary($r->skill->title, $r->hours), '/requests?tab=sent');

            return $r;
        });
    }

    /** The helper says the session took place. The requester then confirms and pays. */
    public function markDone(int $id, User $actor): HelpRequest
    {
        return DB::transaction(function () use ($id, $actor) {
            $r = $this->lock($id);
            $this->mustBeProvider($r, $actor);
            $this->mustBe($r, [RequestStatus::Accepted]);

            $r->forceFill(['status' => RequestStatus::AwaitingConfirmation->value, 'provider_done_at' => now()])->save();
            $this->notifications->send(
                $r->requester,
                'request_marked_done',
                "{$this->first($actor)} marked your session as done",
                "{$r->skill->title}. Confirm to send {$this->credits($r->credits)}.",
                '/requests?tab=sent',
            );

            return $r;
        });
    }

    /** Before it is accepted only the requester can cancel (the helper declines). After that either side can. */
    public function cancel(int $id, User $actor, ?string $reason = null): HelpRequest
    {
        return DB::transaction(function () use ($id, $actor, $reason) {
            $r = $this->lock($id);
            $this->mustBeParticipant($r, $actor);
            $this->mustBe($r, [RequestStatus::Pending, RequestStatus::Accepted, RequestStatus::AwaitingConfirmation]);

            if ($r->status === RequestStatus::Pending && $r->requester_id !== $actor->id) {
                abort(403, 'Decline the request instead of cancelling it.');
            }

            $r->forceFill([
                'status' => RequestStatus::Cancelled->value,
                'cancelled_at' => now(),
                'cancelled_by' => $actor->id,
                'cancel_reason' => $reason ?: 'Cancelled by member',
            ])->save();

            $other = $r->requester_id === $actor->id ? $r->provider : $r->requester;
            $tab = $r->requester_id === $actor->id ? 'received' : 'sent';
            $this->notifications->send($other, 'request_cancelled', "{$this->first($actor)} cancelled the request", $this->summary($r->skill->title, $r->hours), "/requests?tab={$tab}");

            // A helper cancelling after saying yes lowers their reliability.
            $this->trust->recalculate($r->provider);

            return $r;
        });
    }

    /**
     * The requester confirms the session happened: credits move to the helper.
     * Safe to repeat: a request that is already completed is returned unchanged.
     */
    public function complete(int $id, User $actor): HelpRequest
    {
        return DB::transaction(function () use ($id, $actor) {
            $r = $this->lock($id);

            if ($r->requester_id !== $actor->id) {
                abort(403, 'Only the person who asked for help can confirm the session.');
            }
            if ($r->status === RequestStatus::Completed) {
                return $r;
            }
            $this->mustBe($r, [RequestStatus::AwaitingConfirmation]);

            $this->credits->transferForRequest($r);
            $r->forceFill(['status' => RequestStatus::Completed->value, 'completed_at' => now()])->save();

            $provider = $r->provider->refresh();
            $requester = $r->requester->refresh();

            $this->notifications->send($provider, 'request_completed', "Session completed with {$this->first($requester)}", "{$this->credits($r->credits)} received for {$r->skill->title}.", '/credits');
            $this->notifications->send($requester, 'request_completed', "Session completed with {$this->first($provider)}", "{$this->credits($r->credits)} sent for {$r->skill->title}.", '/credits');

            foreach ([$provider, $requester] as $member) {
                $this->badges->evaluate($member, $this->trust->recalculate($member));
            }

            return $r;
        }, 3);
    }

    // ---- helpers ----------------------------------------------------------

    private function lock(int $id): HelpRequest
    {
        return HelpRequest::query()->with(['skill', 'requester', 'provider'])->whereKey($id)->lockForUpdate()->firstOrFail();
    }

    private function mustBeProvider(HelpRequest $r, User $actor): void
    {
        if ($r->provider_id !== $actor->id) {
            abort(403, 'Only the helper can do that.');
        }
    }

    private function mustBeParticipant(HelpRequest $r, User $actor): void
    {
        if (! $r->isParticipant($actor)) {
            abort(403, 'This request is not yours.');
        }
    }

    /** @param  list<RequestStatus>  $allowed */
    private function mustBe(HelpRequest $r, array $allowed): void
    {
        if (! in_array($r->status, $allowed, true)) {
            abort(409, 'This request has already changed. Refresh to see the latest status.');
        }
    }

    private function first(User $user): string
    {
        return Str::before($user->name, ' ');
    }

    private function credits(float|string $amount): string
    {
        $n = (float) $amount;

        return rtrim(rtrim(number_format($n, 2), '0'), '.').($n === 1.0 ? ' credit' : ' credits');
    }

    private function summary(string $title, float|string $hours): string
    {
        $h = (float) $hours;

        return $title.', '.rtrim(rtrim(number_format($h, 2), '0'), '.').($h === 1.0 ? ' hour' : ' hours');
    }
}
