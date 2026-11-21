<?php

namespace Tests\Feature;

use App\Models\CreditTransaction;
use App\Models\HelpRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\HelpRequestTestCase;

/**
 * The credit rules (design 4.3 and 4.4): credits are never lost, doubled or negative,
 * and every balance can be rebuilt from the ledger.
 */
class CreditTransferTest extends HelpRequestTestCase
{
    private function ledgerSum(User $user): string
    {
        return number_format((float) CreditTransaction::query()->where('user_id', $user->id)->sum('amount'), 2, '.', '');
    }

    public function test_confirming_moves_credits_from_the_requester_to_the_helper(): void
    {
        $id = $this->readyToConfirm(1.5);

        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")
            ->assertOk()->assertJsonPath('data.status', 'completed');

        $this->assertSame('1.50', (string) $this->alice->fresh()->credit_balance);
        $this->assertSame('1.50', (string) $this->bob->fresh()->credit_balance);
    }

    public function test_a_transfer_writes_two_ledger_rows_that_sum_to_zero(): void
    {
        $id = $this->readyToConfirm(2);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        $rows = CreditTransaction::query()->where('help_request_id', $id)->get();
        $this->assertCount(2, $rows);
        $this->assertSame(1, $rows->pluck('transfer_uuid')->unique()->count());
        $this->assertEqualsWithDelta(0, (float) $rows->sum('amount'), 0.001);

        $debit = $rows->firstWhere('user_id', $this->alice->id);
        $credit = $rows->firstWhere('user_id', $this->bob->id);
        $this->assertSame('session_debit', $debit->type->value);
        $this->assertSame('-2.00', (string) $debit->amount);
        $this->assertSame('1.00', (string) $debit->balance_after);
        $this->assertSame('session_credit', $credit->type->value);
        $this->assertSame('2.00', (string) $credit->balance_after);
        $this->assertSame("hr:{$id}:debit", $debit->idempotency_key);
    }

    public function test_confirming_twice_never_pays_twice(): void
    {
        $id = $this->readyToConfirm(1);

        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk()->assertJsonPath('data.status', 'completed');
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        $this->assertSame(2, CreditTransaction::query()->where('help_request_id', $id)->count());
        $this->assertSame('2.00', (string) $this->alice->fresh()->credit_balance);
        $this->assertSame('1.00', (string) $this->bob->fresh()->credit_balance);
    }

    public function test_the_database_itself_refuses_a_second_payment_for_the_same_request(): void
    {
        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        CreditTransaction::query()->forceCreate([
            'transfer_uuid' => (string) \Illuminate\Support\Str::uuid(), 'user_id' => $this->alice->id, 'help_request_id' => $id,
            'type' => 'session_debit', 'amount' => -1, 'balance_after' => 0, 'idempotency_key' => "hr:{$id}:debit",
        ]);
    }

    public function test_only_the_requester_can_confirm_and_the_helper_cannot_pay_themselves(): void
    {
        $id = $this->readyToConfirm(1);

        $this->as($this->bob)->postJson("/api/help-requests/{$id}/complete")->assertForbidden();
        $this->assertSame('0.00', (string) $this->bob->fresh()->credit_balance);
        $this->assertSame(0, CreditTransaction::query()->where('help_request_id', $id)->count());
    }

    public function test_a_balance_that_is_too_low_at_confirmation_aborts_everything(): void
    {
        $id = $this->readyToConfirm(2);
        // The requester spent their credits elsewhere in the meantime.
        $this->alice->forceFill(['credit_balance' => 1])->save();

        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertStatus(422);

        $this->assertSame('awaiting_confirmation', HelpRequest::query()->findOrFail($id)->status->value);
        $this->assertSame('1.00', (string) $this->alice->fresh()->credit_balance);
        $this->assertSame('0.00', (string) $this->bob->fresh()->credit_balance);
        $this->assertSame(0, CreditTransaction::query()->where('help_request_id', $id)->count());
    }

    public function test_a_failure_halfway_rolls_back_the_balances_and_the_request(): void
    {
        $id = $this->readyToConfirm(1);

        // Make the second ledger insert fail: its key is already taken.
        CreditTransaction::query()->forceCreate([
            'transfer_uuid' => (string) \Illuminate\Support\Str::uuid(), 'user_id' => $this->bob->id, 'help_request_id' => $id,
            'type' => 'admin_adjustment', 'amount' => 0.5, 'balance_after' => 0.5, 'idempotency_key' => "hr:{$id}:credit",
        ]);
        $this->bob->forceFill(['credit_balance' => 0.5])->save();

        $this->withoutExceptionHandling();
        try {
            $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete");
            $this->fail('The duplicate key should have aborted the transfer.');
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            // expected
        }

        $this->assertSame('awaiting_confirmation', HelpRequest::query()->findOrFail($id)->status->value);
        $this->assertSame('3.00', (string) $this->alice->fresh()->credit_balance);   // not charged
        $this->assertSame('0.50', (string) $this->bob->fresh()->credit_balance);     // unchanged
        $this->assertSame(0, CreditTransaction::query()->where('user_id', $this->alice->id)->count());
    }

    public function test_a_balance_can_never_go_negative_even_if_the_code_were_wrong(): void
    {
        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('users')->where('id', $this->alice->id)->update(['credit_balance' => -1]);
    }

    public function test_every_balance_equals_the_sum_of_its_ledger_rows(): void
    {
        // Give both members a starter row so the ledger covers the whole balance.
        $this->alice->forceFill(['credit_balance' => 0])->save();
        app(\App\Services\CreditService::class)->grantStarter($this->alice);
        $this->alice->refresh();
        app(\App\Services\CreditService::class)->grantStarter($this->bob);
        $this->bob->refresh();
        $this->assertSame('3.00', (string) $this->alice->credit_balance);

        $this->skill->refresh();
        $first = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$first}/complete")->assertOk();
        $second = $this->readyToConfirm(0.5);
        $this->as($this->alice)->postJson("/api/help-requests/{$second}/complete")->assertOk();

        foreach ([$this->alice, $this->bob] as $member) {
            $this->assertSame($this->ledgerSum($member), number_format((float) $member->fresh()->credit_balance, 2, '.', ''), "{$member->name}'s balance drifted from the ledger");
        }
        // Credits are only moved, never created: the total in the system is unchanged by the two transfers.
        $this->assertSame('6.00', number_format((float) User::query()->sum('credit_balance'), 2, '.', ''));
    }

    public function test_the_credits_page_lists_my_rows_newest_first(): void
    {
        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        $this->as($this->alice)->getJson('/api/credits/transactions')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'session_debit')
            ->assertJsonPath('data.0.amount', -1)
            ->assertJsonPath('data.0.balance_after', 2)
            ->assertJsonPath('data.0.counterparty.name', 'Bob Helper')
            ->assertJsonPath('data.0.skill_title', 'Bike repair');

        $this->as($this->bob)->getJson('/api/credits/transactions')->assertJsonPath('data.0.type', 'session_credit')->assertJsonPath('data.0.amount', 1);
    }

    public function test_both_people_are_notified_and_the_first_exchange_badge_is_awarded(): void
    {
        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        $types = fn (User $u) => $u->notifications()->get()->pluck('data.type')->all();
        $this->assertContains('request_completed', $types($this->alice));
        $this->assertContains('request_completed', $types($this->bob));
        $this->assertContains('badge_awarded', $types($this->bob));

        $this->assertContains('first_exchange', $this->bob->badges()->pluck('badges.code')->all());
        $this->assertContains('first_exchange', $this->alice->badges()->pluck('badges.code')->all());
    }
}
