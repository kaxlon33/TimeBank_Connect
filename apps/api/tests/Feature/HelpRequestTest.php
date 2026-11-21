<?php

namespace Tests\Feature;

use App\Models\HelpRequest;
use Tests\HelpRequestTestCase;

class HelpRequestTest extends HelpRequestTestCase
{
    public function test_a_request_is_created_pending_and_the_helper_is_notified(): void
    {
        $this->as($this->alice)
            ->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 1.5, 'message' => 'Brakes please'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.hours', 1.5)
            ->assertJsonPath('data.credits', 1.5)
            ->assertJsonPath('data.provider.name', 'Bob Helper')
            ->assertJsonPath('data.requester.name', 'Alice Requester');

        $note = $this->bob->notifications()->sole();
        $this->assertSame('request_received', $note->data['type']);
        $this->assertSame('New request from Alice Requester', $note->data['title']);
    }

    public function test_the_credit_amount_is_worked_out_on_the_server(): void
    {
        $id = $this->as($this->alice)
            ->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 2, 'credits' => 0.01])
            ->assertCreated()->json('data.id');

        $this->assertSame('2.00', (string) HelpRequest::query()->findOrFail($id)->credits);
    }

    public function test_hours_must_be_in_half_hour_steps_between_half_an_hour_and_four(): void
    {
        foreach ([0, 0.25, 4.5, 1.3, -1] as $bad) {
            $this->as($this->alice)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('hours');
        }
        $this->as($this->alice)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 0.5])->assertCreated();
    }

    public function test_you_cannot_request_your_own_skill(): void
    {
        $this->as($this->bob)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('skill_id');
    }

    public function test_you_cannot_ask_for_more_time_than_you_could_pay_for(): void
    {
        $this->as($this->alice)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 4])
            ->assertStatus(422)->assertJsonValidationErrors('hours');
        $this->assertSame(0, HelpRequest::query()->count());
    }

    public function test_only_one_open_request_per_skill(): void
    {
        $this->ask();
        $this->as($this->alice)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('skill_id');
    }

    public function test_a_removed_skill_cannot_be_requested(): void
    {
        $this->skill->forceFill(['status' => 'removed'])->save();
        $this->as($this->alice)->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => 1])->assertNotFound();
    }

    public function test_the_inbox_and_outbox_list_only_my_requests(): void
    {
        $id = $this->ask();

        $this->as($this->bob)->getJson('/api/help-requests?box=received')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
        $this->as($this->bob)->getJson('/api/help-requests?box=sent')->assertOk()->assertJsonCount(0, 'data');
        $this->as($this->alice)->getJson('/api/help-requests?box=sent')->assertOk()->assertJsonCount(1, 'data');

        $stranger = $this->member('Stranger', 0);
        $this->as($stranger)->getJson('/api/help-requests?box=received')->assertJsonCount(0, 'data');
        $this->as($stranger)->getJson("/api/help-requests/{$id}")->assertNotFound();
    }

    public function test_the_helper_can_accept_and_the_requester_is_told(): void
    {
        $id = $this->ask();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertOk()->assertJsonPath('data.status', 'accepted');

        $this->assertSame('request_accepted', $this->alice->notifications()->sole()->data['type']);
    }

    public function test_the_helper_can_decline(): void
    {
        $id = $this->ask();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/decline")->assertOk()->assertJsonPath('data.status', 'declined');
    }

    public function test_only_the_helper_can_accept_decline_or_mark_done(): void
    {
        $id = $this->ask();

        foreach (['accept', 'decline', 'mark-done'] as $action) {
            $this->as($this->alice)->postJson("/api/help-requests/{$id}/{$action}")->assertForbidden();
        }
        $this->assertSame('pending', HelpRequest::query()->findOrFail($id)->status->value);
    }

    public function test_actions_out_of_order_are_rejected_with_409(): void
    {
        $id = $this->ask();

        $this->as($this->bob)->postJson("/api/help-requests/{$id}/mark-done")->assertStatus(409);   // not accepted yet
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertStatus(409);  // not marked done yet

        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertOk();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertStatus(409);      // already accepted
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/decline")->assertStatus(409);
    }

    public function test_the_requester_can_cancel_a_pending_request_but_the_helper_must_decline(): void
    {
        $id = $this->ask();

        $this->as($this->bob)->postJson("/api/help-requests/{$id}/cancel")->assertForbidden();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/cancel", ['reason' => 'Plans changed'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.cancel_reason', 'Plans changed');

        $this->assertContains('request_cancelled', $this->bob->notifications()->get()->pluck('data.type')->all());
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/cancel")->assertStatus(409);
    }

    public function test_either_side_can_cancel_after_acceptance(): void
    {
        $id = $this->ask();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertOk();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_a_stranger_cannot_touch_someone_elses_request(): void
    {
        $id = $this->ask();
        $stranger = $this->member('Stranger', 5);

        foreach (['accept', 'decline', 'mark-done', 'cancel', 'complete'] as $action) {
            $this->as($stranger)->postJson("/api/help-requests/{$id}/{$action}")->assertForbidden();
        }
    }

    public function test_requests_need_a_signed_in_member(): void
    {
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/help-requests')->assertUnauthorized();
        $this->postJson('/api/help-requests', [])->assertUnauthorized();
        $this->postJson('/api/help-requests/1/complete')->assertUnauthorized();
        $this->getJson('/api/credits/transactions')->assertUnauthorized();
    }
}
