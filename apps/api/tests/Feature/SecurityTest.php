<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\HelpRequestTestCase;

/** Security checks: who may see or change what, and what the API refuses to accept. */
class SecurityTest extends HelpRequestTestCase
{
    public function test_guests_cannot_reach_members_only_endpoints(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $this->getJson('/api/help-requests')->assertUnauthorized();
        $this->postJson('/api/skills', [])->assertUnauthorized();
        $this->getJson('/api/admin/stats')->assertUnauthorized();
    }

    public function test_members_cannot_reach_admin_endpoints(): void
    {
        $this->as($this->alice)->getJson('/api/admin/stats')->assertForbidden();
        $this->as($this->alice)->getJson('/api/admin/members')->assertForbidden();
        $this->as($this->alice)->putJson('/api/admin/settings', [])->assertForbidden();
    }

    public function test_a_suspended_member_is_signed_out_and_refused(): void
    {
        $suspended = $this->member('Sam Suspended', 1);
        $suspended->forceFill(['status' => 'suspended'])->save();

        $this->as($suspended)->getJson('/api/profile')->assertForbidden();
    }

    public function test_a_profile_update_cannot_change_role_status_or_credits(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);

        $this->as($this->alice)->putJson('/api/profile', [
            'name' => 'Alice Renamed',
            'country_code' => 'GB',
            'area_name' => 'Hackney',
            'role' => 'admin',
            'status' => 'suspended',
            'credit_balance' => 999,
            'trust_score' => 100,
        ])->assertOk();

        $alice = User::query()->findOrFail($this->alice->id);
        $this->assertSame('Alice Renamed', $alice->name);
        $this->assertSame('member', $alice->role->value ?? $alice->role);
        $this->assertSame('active', $alice->status->value ?? $alice->status);
        $this->assertSame('3.00', (string) $alice->credit_balance);
    }

    public function test_someone_else_cannot_read_a_help_request(): void
    {
        $id = $this->ask();
        $carol = $this->member('Carol Outsider', 0);

        // Same answer as a request that does not exist, so ids cannot be guessed.
        $this->as($carol)->getJson("/api/help-requests/{$id}")->assertNotFound();
        $this->as($carol)->getJson('/api/help-requests/999999')->assertNotFound();
    }

    public function test_someone_else_cannot_edit_or_delete_a_skill(): void
    {
        $carol = $this->member('Carol Outsider', 0);

        $this->as($carol)->putJson("/api/skills/{$this->skill->id}", ['title' => 'Hacked'])->assertForbidden();
        $this->as($carol)->deleteJson("/api/skills/{$this->skill->id}")->assertForbidden();

        $this->assertSame('Bike repair', $this->skill->fresh()->title);
    }

    public function test_login_is_limited_per_ip_even_when_the_email_changes(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $this->postJson('/api/auth/login', ['email' => "nobody{$i}@example.test", 'password' => 'wrong-pass'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => 'nobody11@example.test', 'password' => 'wrong-pass'])
            ->assertStatus(429);
    }

    public function test_password_reset_answers_the_same_for_known_and_unknown_emails(): void
    {
        $known = $this->postJson('/api/auth/forgot-password', ['email' => $this->alice->email])->assertOk();
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.test'])->assertOk();

        // The body echoes the email typed, so compare what the answer reveals: status and shape only.
        $this->assertSame($known->status(), $unknown->status());
        $this->assertSame(array_keys($known->json()), array_keys($unknown->json()));
    }

    public function test_login_errors_do_not_reveal_whether_an_email_has_an_account(): void
    {
        $unknown = $this->postJson('/api/auth/login', ['email' => 'nobody@example.test', 'password' => 'wrong-pass']);
        $wrongPassword = $this->postJson('/api/auth/login', ['email' => $this->alice->email, 'password' => 'wrong-pass']);

        $this->assertSame($unknown->json('errors.email'), $wrongPassword->json('errors.email'));
    }

    public function test_api_errors_are_json_and_do_not_show_a_stack_trace_in_production_mode(): void
    {
        config(['app.debug' => false]);

        $this->getJson('/api/does-not-exist')->assertNotFound()->assertJsonMissing(['trace']);
    }
}
