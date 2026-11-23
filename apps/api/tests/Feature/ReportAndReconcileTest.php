<?php

namespace Tests\Feature;

use App\Models\CreditTransaction;
use App\Models\Report;
use App\Models\Review;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\HelpRequestTestCase;

class ReportAndReconcileTest extends HelpRequestTestCase
{
    // ---- member reports ----------------------------------------------------------

    public function test_a_member_can_report_a_skill_once(): void
    {
        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => 'Looks like spam'])->assertCreated();

        $report = Report::query()->sole();
        $this->assertSame('open', $report->status);
        $this->assertSame($this->alice->id, $report->reporter_id);

        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => 'Still spam'])->assertStatus(409);
        $this->assertSame(1, Report::query()->count());
    }

    public function test_you_cannot_report_your_own_skill_or_review_or_things_that_do_not_exist(): void
    {
        $this->as($this->bob)->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => 'My own thing'])->assertForbidden();
        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'skill', 'target_id' => 9999, 'reason' => 'Ghost skill'])->assertNotFound();
        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'review', 'target_id' => 9999, 'reason' => 'Ghost review'])->assertNotFound();

        $id = $this->readyToConfirm();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        $reviewId = $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 3])->json('data.id');
        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'review', 'target_id' => $reviewId, 'reason' => 'My own review'])->assertForbidden();
        $this->as($this->bob)->postJson('/api/reports', ['kind' => 'review', 'target_id' => $reviewId, 'reason' => 'Unfair review'])->assertCreated();
    }

    public function test_the_report_form_is_validated(): void
    {
        $this->as($this->alice);
        $this->postJson('/api/reports', ['kind' => 'user', 'target_id' => 1, 'reason' => 'Bad kind'])->assertStatus(422)->assertJsonValidationErrors('kind');
        $this->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => 'x'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => str_repeat('x', 301)])->assertStatus(422);
        $this->postJson('/api/reports', [])->assertStatus(422);
    }

    public function test_a_removed_skill_or_review_can_no_longer_be_reported(): void
    {
        $this->skill->forceFill(['status' => 'removed'])->save();
        $this->as($this->alice)->postJson('/api/reports', ['kind' => 'skill', 'target_id' => $this->skill->id, 'reason' => 'Already gone'])->assertNotFound();
    }

    public function test_reporting_needs_a_signed_in_member(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/reports', ['kind' => 'skill', 'target_id' => 1, 'reason' => 'Nobody home'])->assertUnauthorized();
    }

    // ---- credits:reconcile -------------------------------------------------------

    private function startersAndOneTransfer(): void
    {
        $this->alice->forceFill(['credit_balance' => 0])->save();
        $service = app(\App\Services\CreditService::class);
        $service->grantStarter($this->alice);
        $service->grantStarter($this->bob);

        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
    }

    public function test_reconcile_passes_on_healthy_data(): void
    {
        $this->startersAndOneTransfer();

        $this->artisan('credits:reconcile')->expectsOutputToContain('All balances match the ledger')->assertSuccessful();
    }

    public function test_reconcile_catches_a_balance_that_drifted_from_the_ledger(): void
    {
        $this->startersAndOneTransfer();
        DB::table('users')->where('id', $this->bob->id)->update(['credit_balance' => 10]);   // someone edited the database by hand

        $this->artisan('credits:reconcile')->expectsOutputToContain('Balances that do not match the ledger')->assertFailed();
    }

    public function test_reconcile_catches_a_transfer_that_does_not_net_to_zero(): void
    {
        $this->startersAndOneTransfer();
        $uuid = CreditTransaction::query()->where('type', 'session_credit')->value('transfer_uuid');
        // A credit row with no matching debit: credits created out of thin air.
        DB::table('credit_transactions')->where('transfer_uuid', $uuid)->where('type', 'session_debit')->delete();

        $this->artisan('credits:reconcile')->expectsOutputToContain('Transfers that do not net to zero')->assertFailed();
    }

    public function test_reconcile_never_changes_anything(): void
    {
        $this->startersAndOneTransfer();
        DB::table('users')->where('id', $this->bob->id)->update(['credit_balance' => 10]);
        $rows = CreditTransaction::query()->count();

        $this->artisan('credits:reconcile')->assertFailed();

        $this->assertSame('10.00', (string) $this->bob->fresh()->credit_balance);
        $this->assertSame($rows, CreditTransaction::query()->count());
        $this->assertNotNull(Str::uuid());
        $this->assertSame(0, Review::query()->count());
    }
}
