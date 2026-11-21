<?php

namespace Tests\Feature;

use App\Enums\TransactionType;
use App\Models\Country;
use App\Models\CreditTransaction;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CountrySeeder::class, SettingSeeder::class]);
        // Requests from the React app's origin get a session (Sanctum SPA mode).
        $this->withHeaders(['Referer' => 'http://localhost:5173', 'Accept' => 'application/json']);
    }

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Aye Chan',
            'email' => 'aye@example.test',
            'password' => 'secret-pass-1',
            'country_code' => Country::query()->value('code'),
            'area_name' => 'Hlaing',
        ], $overrides);
    }

    public function test_register_creates_member_area_and_starter_credit_and_signs_in(): void
    {
        $res = $this->postJson('/api/auth/register', $this->registerPayload());

        $res->assertCreated()
            ->assertJsonPath('data.email', 'aye@example.test')
            ->assertJsonPath('data.role', 'member')
            ->assertJsonPath('data.credit_balance', 3)
            ->assertJsonPath('data.area.name', 'Hlaing');

        $user = User::query()->where('email', 'aye@example.test')->firstOrFail();
        $this->assertTrue(password_verify('secret-pass-1', $user->password));
        $this->assertSame('3.00', (string) $user->credit_balance);

        $tx = CreditTransaction::query()->where('user_id', $user->id)->sole();
        $this->assertSame(TransactionType::StarterGrant->value, $tx->type->value ?? $tx->type);
        $this->assertSame('3.00', (string) $tx->balance_after);

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_register_rejects_a_duplicate_email_and_a_short_password(): void
    {
        User::factory()->create(['email' => 'aye@example.test']);

        $this->postJson('/api/auth/register', $this->registerPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->postJson('/api/auth/register', $this->registerPayload(['email' => 'new@example.test', 'password' => 'short']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_the_same_area_is_reused_not_duplicated(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload())->assertCreated();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/register', $this->registerPayload(['email' => 'b@example.test', 'area_name' => '  hlaing ']))->assertCreated();

        $this->assertSame(1, \App\Models\Area::query()->count());
    }

    public function test_login_succeeds_with_the_right_password(): void
    {
        User::factory()->create(['email' => 'sam@example.test', 'password' => 'password']);

        $this->postJson('/api/auth/login', ['email' => 'SAM@example.test', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.email', 'sam@example.test');

        $this->getJson('/api/auth/me')->assertOk();
    }

    public function test_login_fails_with_a_wrong_password_and_stays_signed_out(): void
    {
        User::factory()->create(['email' => 'sam@example.test', 'password' => 'password']);

        $this->postJson('/api/auth/login', ['email' => 'sam@example.test', 'password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Email or password is incorrect');

        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_a_suspended_member_cannot_sign_in(): void
    {
        $user = User::factory()->create(['email' => 'sam@example.test', 'password' => 'password']);
        $user->forceFill(['status' => 'suspended', 'suspended_reason' => 'Test'])->save();

        $this->postJson('/api/auth/login', ['email' => 'sam@example.test', 'password' => 'password'])
            ->assertForbidden();

        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_login_is_rate_limited_after_five_bad_attempts(): void
    {
        User::factory()->create(['email' => 'sam@example.test', 'password' => 'password']);

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/auth/login', ['email' => 'sam@example.test', 'password' => 'bad'])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', ['email' => 'sam@example.test', 'password' => 'password'])->assertStatus(429);
    }

    public function test_logout_ends_the_session(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        $this->getJson('/api/auth/me')->assertOk();

        $this->postJson('/api/auth/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_me_needs_a_signed_in_member(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_check_email_reports_availability(): void
    {
        User::factory()->create(['email' => 'taken@example.test']);

        $this->getJson('/api/auth/check-email?email=taken@example.test')->assertOk()->assertJson(['available' => false]);
        $this->getJson('/api/auth/check-email?email=free@example.test')->assertOk()->assertJson(['available' => true]);
    }

    public function test_forgot_password_answers_the_same_for_known_and_unknown_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'sam@example.test']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'sam@example.test'])->assertOk();
        $this->postJson('/api/auth/forgot-password', ['email' => 'ghost@example.test'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_a_valid_reset_token_sets_a_new_password(): void
    {
        $user = User::factory()->create(['email' => 'sam@example.test', 'password' => 'old-password']);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'sam@example.test',
            'password' => 'brand-new-pass',
        ])->assertOk();

        $this->assertTrue(password_verify('brand-new-pass', $user->fresh()->password));

        // The token is single use.
        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'sam@example.test',
            'password' => 'another-pass-1',
        ])->assertStatus(422);
    }

    public function test_the_reset_link_in_the_email_points_at_the_react_app(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'sam@example.test']);
        $this->postJson('/api/auth/forgot-password', ['email' => 'sam@example.test'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use ($user) {
            $url = ResetPassword::$createUrlCallback ? (ResetPassword::$createUrlCallback)($user, $n->token) : '';

            return str_starts_with($url, 'http://localhost:5173/reset-password?token=') && str_contains($url, 'email=sam%40example.test');
        });
    }
}
