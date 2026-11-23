<?php

namespace Tests;

use App\Models\HelpRequest;
use App\Models\Skill;
use App\Models\SkillCategory;
use App\Models\User;
use Database\Seeders\BadgeSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class HelpRequestTestCase extends TestCase
{
    use RefreshDatabase;

    protected User $alice;   // asks for help, has 3 credits

    protected User $bob;     // offers the skill

    protected Skill $skill;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([SettingSeeder::class, BadgeSeeder::class]);
        $this->withHeaders(['Referer' => 'http://localhost:5173', 'Accept' => 'application/json']);

        $this->alice = $this->member('Alice Requester', 3);
        $this->bob = $this->member('Bob Helper', 0);

        $category = SkillCategory::query()->create(['name' => 'Repairs', 'slug' => 'repairs']);
        $this->skill = new Skill(['category_id' => $category->id, 'title' => 'Bike repair', 'description' => 'Fix bikes']);
        $this->skill->user_id = $this->bob->id;
        $this->skill->save();
    }

    protected function member(string $name, float $credits): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->forceFill(['credit_balance' => $credits])->save();

        return $user;
    }

    protected function as(User $user): static
    {
        $this->app['auth']->forgetGuards();
        $this->actingAs($user, 'web');

        return $this;
    }

    protected function ask(float $hours = 1, array $extra = []): int
    {
        return $this->as($this->alice)
            ->postJson('/api/help-requests', ['skill_id' => $this->skill->id, 'hours' => $hours, 'message' => 'Please help'] + $extra)
            ->assertCreated()->json('data.id');
    }

    /** Takes a request all the way to "awaiting confirmation". */
    protected function readyToConfirm(float $hours = 1): int
    {
        $id = $this->ask($hours);
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertOk();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/mark-done")->assertOk();

        return $id;
    }

    /** A real, valid PNG (no image library needed) as a data URL, like the browser sends. */
    protected function pngDataUrl(int $w = 32, int $h = 32): string
    {
        $raw = '';
        for ($y = 0; $y < $h; $y++) {
            $raw .= "\0".str_repeat("\x20\x80\xC0", $w);
        }
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $png = "\x89PNG\r\n\x1a\n".$chunk('IHDR', pack('NNCCCCC', $w, $h, 8, 2, 0, 0, 0)).$chunk('IDAT', gzcompress($raw)).$chunk('IEND', '');

        return 'data:image/png;base64,'.base64_encode($png);
    }

    protected function admin(): User
    {
        $admin = User::factory()->create(['name' => 'Ada Admin']);
        $admin->forceFill(['role' => 'admin'])->save();

        return $admin;
    }
}
