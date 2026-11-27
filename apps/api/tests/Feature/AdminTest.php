<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\AuditLog;
use App\Models\HelpRequest;
use App\Models\Report;
use App\Models\Review;
use App\Models\SkillCategory;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Facades\DB;
use Tests\HelpRequestTestCase;

class AdminTest extends HelpRequestTestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->admin();
    }

    private function report(User $by, string $type, int $id, string $reason = 'Spam'): void
    {
        $r = new Report(['reason' => $reason]);
        $r->forceFill(['reporter_id' => $by->id, 'target_type' => $type, 'target_id' => $id])->save();
    }

    // ---- access ------------------------------------------------------------------

    public function test_only_admins_can_use_the_admin_api(): void
    {
        $urls = ['stats', 'members', 'categories', 'moderation', 'settings', 'reports/count'];

        $this->app['auth']->forgetGuards();
        foreach ($urls as $u) {
            $this->getJson("/api/admin/{$u}")->assertUnauthorized();
        }

        foreach ($urls as $u) {
            $this->as($this->alice)->getJson("/api/admin/{$u}")->assertForbidden();
        }
        $this->as($this->alice)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'suspended', 'reason' => 'x y z'])->assertForbidden();
        $this->as($this->alice)->postJson('/api/admin/categories', ['name' => 'Sneaky'])->assertForbidden();
        $this->as($this->alice)->putJson('/api/admin/settings', [])->assertForbidden();

        foreach ($urls as $u) {
            $this->as($this->admin)->getJson("/api/admin/{$u}")->assertOk();
        }
    }

    // ---- stats -------------------------------------------------------------------

    public function test_the_overview_numbers_are_worked_out_from_the_database(): void
    {
        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        $this->bob->forceFill(['status' => 'suspended'])->save();

        $res = $this->as($this->admin)->getJson('/api/admin/stats')->assertOk();

        $res->assertJsonPath('data.total_members', 2)         // admins are not counted
            ->assertJsonPath('data.active_members', 1)
            ->assertJsonPath('data.suspended_members', 1)
            ->assertJsonPath('data.completed_sessions', 1)
            ->assertJsonPath('data.credits_in_circulation', 3)
            ->assertJsonPath('data.popular_skills.0.title', 'Bike repair')
            ->assertJsonPath('data.popular_skills.0.requests', 1)
            ->assertJsonCount(6, 'data.sessions_by_week')
            ->assertJsonPath('data.sessions_by_week.5.week', 'This wk')
            ->assertJsonPath('data.sessions_by_week.5.sessions', 1)
            ->assertJsonPath('data.sessions_by_week.0.sessions', 0);
    }

    // ---- members -----------------------------------------------------------------

    public function test_members_are_listed_without_admins_and_can_be_searched(): void
    {
        $this->as($this->admin)->getJson('/api/admin/members')->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonMissing(['name' => 'Ada Admin']);

        $this->as($this->admin)->getJson('/api/admin/members?q=bob')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Bob Helper');
        $this->as($this->admin)->getJson('/api/admin/members?q=nobody-here')->assertJsonCount(0, 'data');
        $this->as($this->admin)->getJson('/api/admin/members?q=bob')->assertJsonStructure(['data' => [['id', 'name', 'email', 'status', 'credit_balance', 'trust_score', 'completed_sessions', 'last_active_at', 'joined_at']]]);
    }

    public function test_suspending_needs_a_reason_and_signs_the_member_out_at_once(): void
    {
        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'suspended'])
            ->assertStatus(422)->assertJsonValidationErrors('reason');

        DB::table('sessions')->insert(['id' => 'abc', 'user_id' => $this->bob->id, 'payload' => 'x', 'last_activity' => time()]);

        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'suspended', 'reason' => 'Posting spam'])
            ->assertOk()->assertJsonPath('data.status', 'suspended');

        $bob = $this->bob->fresh();
        $this->assertSame('suspended', $bob->status->value);
        $this->assertSame('Posting spam', $bob->suspended_reason);
        $this->assertNotNull($bob->suspended_at);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $bob->id)->count());

        $log = AuditLog::query()->latest('id')->first();
        $this->assertSame('member.suspend', $log->action);
        $this->assertSame($this->admin->id, $log->actor_id);
        $this->assertSame('Posting spam', $log->meta['reason']);
        $this->assertSame('Bob Helper', $log->meta['label']);
    }

    public function test_a_suspended_member_is_blocked_on_their_very_next_request(): void
    {
        $this->as($this->bob)->getJson('/api/profile')->assertOk();
        $this->bob->forceFill(['status' => 'suspended'])->save();

        $this->as($this->bob->fresh())->getJson('/api/profile')->assertForbidden()->assertJsonPath('message', 'This account has been suspended. Contact the TimeBank team for help.');
    }

    public function test_a_member_can_be_reactivated(): void
    {
        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'suspended', 'reason' => 'Testing it'])->assertOk();
        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'active'])->assertOk()->assertJsonPath('data.status', 'active');

        $bob = $this->bob->fresh();
        $this->assertSame('active', $bob->status->value);
        $this->assertNull($bob->suspended_reason);
        $this->assertSame('member.reactivate', AuditLog::query()->latest('id')->value('action'));
    }

    public function test_admins_and_yourself_cannot_be_suspended_and_states_are_checked(): void
    {
        $other = $this->admin();
        $this->as($this->admin)->postJson("/api/admin/members/{$other->id}/status", ['status' => 'suspended', 'reason' => 'Nope nope'])->assertForbidden();
        $this->as($this->admin)->postJson("/api/admin/members/{$this->admin->id}/status", ['status' => 'suspended', 'reason' => 'Nope nope'])->assertForbidden();
        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'active'])->assertStatus(409);
        $this->as($this->admin)->postJson('/api/admin/members/99999/status', ['status' => 'suspended', 'reason' => 'Nope nope'])->assertNotFound();
        $this->as($this->admin)->postJson("/api/admin/members/{$this->bob->id}/status", ['status' => 'banned', 'reason' => 'Nope nope'])->assertStatus(422);
    }

    public function test_last_active_is_recorded_when_a_member_uses_the_app(): void
    {
        $this->assertNull($this->alice->fresh()->last_active_at);
        $this->as($this->alice)->getJson('/api/profile')->assertOk();
        $this->assertNotNull($this->alice->fresh()->last_active_at);
    }

    // ---- categories --------------------------------------------------------------

    public function test_categories_can_be_added_renamed_and_switched_off(): void
    {
        $id = $this->as($this->admin)->postJson('/api/admin/categories', ['name' => 'Pet Care'])
            ->assertCreated()->assertJsonPath('data.slug', 'pet-care')->assertJsonPath('data.is_active', true)->json('data.id');

        $this->as($this->admin)->putJson("/api/admin/categories/{$id}", ['name' => 'Pet and Animal Care'])
            ->assertOk()->assertJsonPath('data.slug', 'pet-and-animal-care');

        $this->as($this->admin)->postJson("/api/admin/categories/{$id}/toggle")->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/categories')->assertJsonMissing(['name' => 'Pet and Animal Care']);                 // hidden from members
        $this->as($this->admin)->getJson('/api/admin/categories')->assertJsonFragment(['name' => 'Pet and Animal Care', 'is_active' => false]); // still visible to admins

        $this->as($this->admin)->postJson("/api/admin/categories/{$id}/toggle")->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertSame(['category.create', 'category.rename', 'category.disable', 'category.enable'], AuditLog::query()->orderBy('id')->pluck('action')->all());
    }

    public function test_category_names_must_be_unique_and_valid(): void
    {
        $this->as($this->admin)->postJson('/api/admin/categories', ['name' => 'repairs'])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->as($this->admin)->postJson('/api/admin/categories', ['name' => 'x'])->assertStatus(422);
        $this->as($this->admin)->postJson('/api/admin/categories', [])->assertStatus(422);
        $a = SkillCategory::query()->create(['name' => 'Alpha', 'slug' => 'alpha']);
        $this->as($this->admin)->putJson("/api/admin/categories/{$a->id}", ['name' => 'REPAIRS'])->assertStatus(422);
        $this->as($this->admin)->putJson("/api/admin/categories/{$a->id}", ['name' => 'Alpha'])->assertOk();   // keeping its own name is fine
    }

    // ---- reports and moderation --------------------------------------------------

    public function test_reports_are_grouped_into_one_queue_item_per_thing(): void
    {
        $carol = $this->member('Carol', 0);
        $this->report($this->alice, 'skill', $this->skill->id, 'Spam');
        $this->report($carol, 'skill', $this->skill->id, 'Not a skill');

        $res = $this->as($this->admin)->getJson('/api/admin/moderation')->assertOk();

        $res->assertJsonCount(1, 'data.reported')
            ->assertJsonPath('data.reported.0.kind', 'skill')
            ->assertJsonPath('data.reported.0.title', 'Bike repair')
            ->assertJsonPath('data.reported.0.author', 'Bob Helper')
            ->assertJsonPath('data.reported.0.reports', 2)
            ->assertJsonPath('data.reported.0.reason', 'Not a skill');
        $res->assertJsonPath('data.skills.0.report_count', 2);

        $this->as($this->admin)->getJson('/api/admin/reports/count')->assertJsonPath('open', 1);
    }

    public function test_removing_a_skill_closes_its_reports_cancels_pending_requests_and_is_logged(): void
    {
        $this->report($this->alice, 'skill', $this->skill->id);
        $pending = $this->ask();

        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", ['reason' => 'Spam: not a skill exchange.'])->assertOk();

        $skill = $this->skill->fresh();
        $this->assertSame('removed', $skill->status->value);
        $this->assertSame($this->admin->id, $skill->removed_by);
        $this->assertSame('Spam: not a skill exchange.', $skill->removed_reason);

        $this->assertSame('actioned', Report::query()->first()->status);
        $this->assertSame('cancelled', HelpRequest::query()->findOrFail($pending)->status->value);
        $this->assertContains('request_cancelled', $this->alice->notifications()->get()->pluck('data.type')->all());

        $this->as($this->alice)->getJson('/api/skills')->assertJsonMissing(['id' => $this->skill->id]);
        $this->as($this->admin)->getJson('/api/admin/moderation')->assertJsonCount(0, 'data.reported')->assertJsonPath('data.audit.0.action', 'skill.remove')
            ->assertJsonPath('data.audit.0.actor', 'Ada Admin')->assertJsonPath('data.audit.0.target', 'Bike repair');

        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", ['reason' => 'Again again'])->assertStatus(409);
    }

    public function test_a_removed_skill_can_be_restored(): void
    {
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", ['reason' => 'Mistake maybe'])->assertOk();
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/restore", ['reason' => 'It was fine'])->assertOk();

        $skill = $this->skill->fresh();
        $this->assertSame('active', $skill->status->value);
        $this->assertNull($skill->removed_by);
        $this->as($this->alice)->getJson('/api/skills')->assertJsonFragment(['id' => $this->skill->id]);
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/restore", ['reason' => 'Again again'])->assertStatus(409);
    }

    public function test_only_a_removal_that_is_still_in_force_offers_restore(): void
    {
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", ['reason' => 'First removal'])->assertOk();
        $this->as($this->admin)->getJson('/api/admin/moderation')
            ->assertJsonPath('data.audit.0.action', 'skill.remove')->assertJsonPath('data.audit.0.restorable', true)
            ->assertJsonPath('data.audit.0.target_type', 'skill')->assertJsonPath('data.audit.0.target_id', $this->skill->id);

        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/restore", ['reason' => 'Restoring it'])->assertOk();
        $res = $this->as($this->admin)->getJson('/api/admin/moderation');
        $res->assertJsonPath('data.audit.0.action', 'skill.restore')->assertJsonPath('data.audit.0.restorable', false)
            ->assertJsonPath('data.audit.1.action', 'skill.remove')->assertJsonPath('data.audit.1.restorable', false);
    }

    public function test_removing_a_review_stops_it_counting_and_restoring_brings_it_back(): void
    {
        $id = $this->readyToConfirm();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        $reviewId = $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 1, 'comment' => 'Rude and unfair'])->json('data.id');
        $withReview = (float) $this->bob->fresh()->trust_score;

        $this->as($this->admin)->postJson("/api/admin/moderation/review/{$reviewId}/remove", ['reason' => 'Personal attack'])->assertOk();

        $this->assertSame('removed', Review::query()->findOrFail($reviewId)->status->value);
        $this->assertGreaterThan($withReview, (float) $this->bob->fresh()->trust_score);          // a removed 1-star no longer drags the score down
        $this->as($this->bob)->getJson('/api/profile')->assertJsonCount(0, 'data.reviews');

        $this->as($this->admin)->postJson("/api/admin/moderation/review/{$reviewId}/restore", ['reason' => 'Actually fine'])->assertOk();
        $this->assertEqualsWithDelta($withReview, (float) $this->bob->fresh()->trust_score, 0.01);
    }

    public function test_dismissing_a_report_keeps_the_content_and_logs_it(): void
    {
        $carol = $this->member('Carol', 0);
        $this->report($this->alice, 'skill', $this->skill->id);
        $this->report($carol, 'skill', $this->skill->id);
        $reportId = Report::query()->orderBy('id')->value('id');

        $this->as($this->admin)->postJson("/api/admin/reports/{$reportId}/dismiss")->assertOk();

        $this->assertSame(0, Report::query()->open()->count());
        $this->assertSame(['dismissed', 'dismissed'], Report::query()->orderBy('id')->pluck('status')->all());
        $this->assertSame('active', $this->skill->fresh()->status->value);
        $this->assertSame('report.dismiss', AuditLog::query()->latest('id')->value('action'));
        $this->as($this->admin)->postJson("/api/admin/reports/{$reportId}/dismiss")->assertNotFound();
    }

    public function test_moderation_actions_need_a_reason(): void
    {
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", [])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->as($this->admin)->postJson("/api/admin/moderation/skill/{$this->skill->id}/remove", ['reason' => 'no'])->assertStatus(422);
        $this->as($this->admin)->postJson("/api/admin/moderation/thing/{$this->skill->id}/remove", ['reason' => 'Some reason'])->assertNotFound();
        $this->assertSame('active', $this->skill->fresh()->status->value);
    }

    // ---- settings ----------------------------------------------------------------

    private function settings(array $overrides = []): array
    {
        return array_replace_recursive([
            'starter_credit' => 5,
            'matching' => ['weights' => ['skill' => 40, 'location' => 25, 'availability' => 15, 'reputation' => 20], 'max_distance_km' => 30, 'min_score' => 35, 'max_results' => 12],
        ], $overrides);
    }

    public function test_settings_can_be_read_and_saved_and_the_change_is_logged(): void
    {
        $this->as($this->admin)->getJson('/api/admin/settings')->assertOk()->assertJsonPath('data.starter_credit', 3)->assertJsonPath('data.matching.weights.skill', 40);

        $this->as($this->admin)->putJson('/api/admin/settings', $this->settings())->assertOk()
            ->assertJsonPath('data.starter_credit', 5)->assertJsonPath('data.matching.max_distance_km', 30);

        $this->assertEquals(5, AppSetting::getValue('starter_credit'));
        $log = AuditLog::query()->latest('id')->first();
        $this->assertSame('settings.update', $log->action);
        $this->assertEquals(3, $log->meta['before']['starter_credit']);
        $this->assertEquals(5, $log->meta['after']['starter_credit']);
    }

    public function test_matching_weights_must_add_up_to_100(): void
    {
        $this->as($this->admin)->putJson('/api/admin/settings', $this->settings(['matching' => ['weights' => ['skill' => 50]]]))
            ->assertStatus(422)->assertJsonValidationErrors('weights');
        $this->assertEquals(3, AppSetting::getValue('starter_credit'));
    }

    public function test_settings_values_are_range_checked(): void
    {
        $this->as($this->admin);
        $this->putJson('/api/admin/settings', $this->settings(['starter_credit' => 50]))->assertStatus(422)->assertJsonValidationErrors('starter_credit');
        $this->putJson('/api/admin/settings', $this->settings(['starter_credit' => 2.3]))->assertStatus(422)->assertJsonValidationErrors('starter_credit');
        $this->putJson('/api/admin/settings', $this->settings(['matching' => ['max_distance_km' => 0]]))->assertStatus(422);
        $this->putJson('/api/admin/settings', [])->assertStatus(422);
    }

    public function test_the_overview_reports_whether_the_ledger_is_balanced(): void
    {
        $id = $this->readyToConfirm(1);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        // Alice's starting 3 credits were set by hand in this test, so give the ledger a matching row.
        $service = app(\App\Services\CreditService::class);
        DB::table('users')->update(['credit_balance' => 0]);
        DB::table('credit_transactions')->delete();
        $service->grantStarter($this->alice->refresh());

        $this->as($this->admin)->getJson('/api/admin/stats')->assertJsonPath('data.ledger_balanced', true);

        DB::table('users')->where('id', $this->bob->id)->update(['credit_balance' => 50]);   // drift
        $this->as($this->admin)->getJson('/api/admin/stats')->assertJsonPath('data.ledger_balanced', false);
    }

    public function test_older_log_entries_without_a_name_still_show_what_they_were_about(): void
    {
        $log = new AuditLog;
        $log->forceFill(['actor_id' => $this->admin->id, 'action' => 'member.suspend', 'target_type' => 'user', 'target_id' => $this->bob->id, 'meta' => ['reason' => 'Old entry']])->save();

        $this->as($this->admin)->getJson('/api/admin/moderation')->assertJsonPath('data.audit.0.target', 'Bob Helper')->assertJsonPath('data.audit.0.reason', 'Old entry');
    }

    public function test_a_new_member_gets_the_starter_credit_the_admin_chose(): void
    {
        $this->seed(CountrySeeder::class);
        $this->as($this->admin)->putJson('/api/admin/settings', $this->settings(['starter_credit' => 4.5]))->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Referer' => 'http://localhost:5173', 'Accept' => 'application/json']);
        $this->postJson('/api/auth/register', [
            'name' => 'Newcomer', 'email' => 'newcomer@example.test', 'password' => 'long-enough-pass', 'country_code' => 'GB', 'area_name' => 'Camden',
        ])->assertCreated()->assertJsonPath('data.credit_balance', 4.5);
    }
}
