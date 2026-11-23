<?php

namespace Tests\Feature;

use App\Models\Skill;
use App\Models\SkillCategory;
use Illuminate\Support\Facades\Storage;
use Tests\HelpRequestTestCase;

class SkillWriteTest extends HelpRequestTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Garden weeding',
            'description' => 'I can tidy a small garden in an afternoon.',
            'category_id' => $this->skill->category_id,
        ], $overrides);
    }

    public function test_a_member_can_post_a_skill_with_a_picture(): void
    {
        $res = $this->as($this->alice)->postJson('/api/skills', $this->payload(['image_url' => $this->pngDataUrl()]))
            ->assertCreated()
            ->assertJsonPath('data.title', 'Garden weeding')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.user.name', 'Alice Requester');

        $skill = Skill::query()->findOrFail($res->json('data.id'));
        $this->assertSame($this->alice->id, $skill->user_id);
        Storage::disk('public')->assertExists($skill->image_path);
        $this->assertStringEndsWith($skill->image_path, $res->json('data.image_url'));
    }

    public function test_the_new_skill_shows_up_for_other_members_and_in_my_skills(): void
    {
        $id = $this->as($this->alice)->postJson('/api/skills', $this->payload())->assertCreated()->json('data.id');

        $this->as($this->bob)->getJson('/api/skills')->assertJsonFragment(['id' => $id]);
        $this->as($this->alice)->getJson('/api/my/skills')->assertJsonFragment(['id' => $id]);
    }

    public function test_owner_status_and_moderation_fields_cannot_be_set_by_the_client(): void
    {
        $id = $this->as($this->alice)->postJson('/api/skills', $this->payload(['user_id' => $this->bob->id, 'status' => 'removed']))
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $id = $this->as($this->alice)->postJson('/api/skills', $this->payload(['user_id' => $this->bob->id]))->assertCreated()->json('data.id');
        $this->assertSame($this->alice->id, Skill::query()->findOrFail($id)->user_id);
    }

    public function test_the_form_is_validated(): void
    {
        $this->as($this->alice);
        $this->postJson('/api/skills', $this->payload(['title' => 'ab']))->assertStatus(422)->assertJsonValidationErrors('title');
        $this->postJson('/api/skills', $this->payload(['description' => 'short']))->assertStatus(422)->assertJsonValidationErrors('description');
        $this->postJson('/api/skills', $this->payload(['category_id' => 9999]))->assertStatus(422)->assertJsonValidationErrors('category_id');
        $this->postJson('/api/skills', [])->assertStatus(422);
    }

    public function test_a_switched_off_category_cannot_be_used(): void
    {
        $off = SkillCategory::query()->create(['name' => 'Retired', 'slug' => 'retired']);
        $off->forceFill(['is_active' => false])->save();

        $this->as($this->alice)->postJson('/api/skills', $this->payload(['category_id' => $off->id]))
            ->assertStatus(422)->assertJsonValidationErrors('category_id');
    }

    public function test_pictures_must_be_real_images(): void
    {
        $this->as($this->alice);
        $this->postJson('/api/skills', $this->payload(['image_url' => 'data:text/html;base64,'.base64_encode('<script>alert(1)</script>')]))
            ->assertStatus(422)->assertJsonValidationErrors('image_url');
        // Labelled as a PNG but the bytes are not an image.
        $this->postJson('/api/skills', $this->payload(['image_url' => 'data:image/png;base64,'.base64_encode('not an image at all')]))
            ->assertStatus(422)->assertJsonValidationErrors('image_url');
        $this->postJson('/api/skills', $this->payload(['image_url' => 'https://evil.example/pic.png']))
            ->assertStatus(422)->assertJsonValidationErrors('image_url');
        // Too small to be a usable picture.
        $this->postJson('/api/skills', $this->payload(['image_url' => $this->pngDataUrl(4, 4)]))
            ->assertStatus(422)->assertJsonValidationErrors('image_url');

        $this->assertSame(0, Skill::query()->where('user_id', $this->alice->id)->count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_a_member_can_offer_at_most_ten_skills(): void
    {
        $this->as($this->alice);
        foreach (range(1, 10) as $i) {
            $this->postJson('/api/skills', $this->payload(['title' => "Skill number {$i}"]))->assertCreated();
        }
        $this->postJson('/api/skills', $this->payload(['title' => 'One too many']))->assertStatus(422)->assertJsonValidationErrors('title');
    }

    public function test_the_owner_can_edit_hide_and_show_a_skill(): void
    {
        $this->as($this->bob)->putJson("/api/skills/{$this->skill->id}", $this->payload(['title' => 'Bike repair and more', 'status' => 'hidden']))
            ->assertOk()->assertJsonPath('data.title', 'Bike repair and more')->assertJsonPath('data.status', 'hidden');

        $this->as($this->alice)->getJson('/api/skills')->assertJsonMissing(['id' => $this->skill->id]);

        $this->as($this->bob)->putJson("/api/skills/{$this->skill->id}", $this->payload(['status' => 'active']))
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->as($this->alice)->getJson('/api/skills')->assertJsonFragment(['id' => $this->skill->id]);
    }

    public function test_only_the_owner_can_edit_or_delete(): void
    {
        $this->as($this->alice)->putJson("/api/skills/{$this->skill->id}", $this->payload())->assertForbidden();
        $this->as($this->alice)->deleteJson("/api/skills/{$this->skill->id}")->assertForbidden();
        $this->assertSame('Bike repair', $this->skill->fresh()->title);
    }

    public function test_replacing_and_removing_a_picture_cleans_up_the_old_file(): void
    {
        $id = $this->as($this->bob)->postJson('/api/skills', $this->payload(['image_url' => $this->pngDataUrl()]))->json('data.id');
        $first = Skill::query()->findOrFail($id)->image_path;

        // Leaving image_url out keeps the picture.
        $this->as($this->bob)->putJson("/api/skills/{$id}", $this->payload(['title' => 'Garden weeding again']))->assertOk();
        $this->assertSame($first, Skill::query()->findOrFail($id)->image_path);

        $this->as($this->bob)->putJson("/api/skills/{$id}", $this->payload(['image_url' => $this->pngDataUrl(40, 40)]))->assertOk();
        $second = Skill::query()->findOrFail($id)->image_path;
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->as($this->bob)->putJson("/api/skills/{$id}", $this->payload(['image_url' => null]))->assertOk()->assertJsonPath('data.image_url', null);
        Storage::disk('public')->assertMissing($second);
    }

    public function test_an_unused_skill_can_be_deleted_with_its_picture(): void
    {
        $id = $this->as($this->alice)->postJson('/api/skills', $this->payload(['image_url' => $this->pngDataUrl()]))->json('data.id');
        $path = Skill::query()->findOrFail($id)->image_path;

        $this->as($this->alice)->deleteJson("/api/skills/{$id}")->assertOk();
        $this->assertNull(Skill::query()->find($id));
        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_skill_that_has_been_requested_cannot_be_deleted_only_hidden(): void
    {
        $this->ask();

        $this->as($this->bob)->deleteJson("/api/skills/{$this->skill->id}")->assertStatus(409);
        $this->assertNotNull(Skill::query()->find($this->skill->id));
    }

    public function test_a_removed_skill_cannot_be_edited(): void
    {
        $this->skill->forceFill(['status' => 'removed'])->save();
        $this->as($this->bob)->putJson("/api/skills/{$this->skill->id}", $this->payload())->assertNotFound();
    }

    public function test_writing_needs_a_signed_in_member(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/skills', $this->payload())->assertUnauthorized();
        $this->putJson("/api/skills/{$this->skill->id}", $this->payload())->assertUnauthorized();
        $this->deleteJson("/api/skills/{$this->skill->id}")->assertUnauthorized();
    }
}
