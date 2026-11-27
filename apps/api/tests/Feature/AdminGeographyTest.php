<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AuditLog;
use App\Models\Country;
use Database\Seeders\CountrySeeder;
use Tests\HelpRequestTestCase;

class AdminGeographyTest extends HelpRequestTestCase
{
    private Country $gb;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CountrySeeder::class);
        $this->gb = Country::query()->where('code', 'GB')->firstOrFail();
    }

    private function area(string $name): Area
    {
        return Area::query()->create([
            'country_id' => $this->gb->id,
            'name' => $name,
            'latitude' => 51.5,
            'longitude' => -0.1,
        ]);
    }

    public function test_members_cannot_use_the_country_or_area_admin_tools(): void
    {
        $this->as($this->alice)->getJson('/api/admin/countries')->assertForbidden();
        $this->as($this->alice)->postJson("/api/admin/countries/{$this->gb->id}/toggle")->assertForbidden();
        $this->as($this->alice)->getJson('/api/admin/areas')->assertForbidden();
        $this->as($this->alice)->putJson('/api/admin/areas/1', ['name' => 'Anywhere'])->assertForbidden();
        $this->as($this->alice)->deleteJson('/api/admin/areas/1')->assertForbidden();
    }

    public function test_switching_a_country_off_hides_it_and_its_areas_then_back_on(): void
    {
        $this->area('Hackney');

        $this->getJson('/api/countries')->assertJsonFragment(['code' => 'GB']);
        $this->getJson('/api/areas?country_code=GB&q=Hack')->assertJsonCount(1, 'data');

        $this->as($this->admin())->postJson("/api/admin/countries/{$this->gb->id}/toggle")
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->getJson('/api/countries')->assertJsonMissing(['code' => 'GB']);
        $this->getJson('/api/areas?country_code=GB&q=Hack')->assertJsonCount(0, 'data');

        $this->as($this->admin())->postJson("/api/admin/countries/{$this->gb->id}/toggle")
            ->assertOk()->assertJsonPath('data.is_active', true);

        $this->getJson('/api/countries')->assertJsonFragment(['code' => 'GB']);
        $this->assertSame(2, AuditLog::query()->where('action', 'like', 'country.%')->count());
    }

    public function test_admin_can_rename_an_area_but_not_to_a_name_already_used_in_that_country(): void
    {
        $hackney = $this->area('Hackney');
        $this->area('Camden');

        $this->as($this->admin())->putJson("/api/admin/areas/{$hackney->id}", ['name' => 'Hackney Central'])
            ->assertOk()->assertJsonPath('data.name', 'Hackney Central');
        $this->assertSame('hackney central', $hackney->fresh()->name_normalized);

        $this->as($this->admin())->putJson("/api/admin/areas/{$hackney->id}", ['name' => ' camden '])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        $this->assertDatabaseHas('audit_logs', ['action' => 'area.rename', 'target_id' => $hackney->id]);
    }

    public function test_an_area_with_members_cannot_be_deleted_but_an_empty_one_can(): void
    {
        $occupied = $this->area('Hackney');
        $empty = $this->area('Unused Place');
        $this->alice->forceFill(['area_id' => $occupied->id])->save();

        $this->as($this->admin())->deleteJson("/api/admin/areas/{$occupied->id}")->assertStatus(409);
        $this->assertNotNull(Area::query()->find($occupied->id));

        $this->as($this->admin())->deleteJson("/api/admin/areas/{$empty->id}")->assertOk();
        $this->assertNull(Area::query()->find($empty->id));

        $this->assertDatabaseHas('audit_logs', ['action' => 'area.delete', 'target_id' => $empty->id]);
    }

    public function test_admin_can_search_areas_and_see_how_many_members_live_there(): void
    {
        $hackney = $this->area('Hackney');
        $this->area('Camden');
        $this->alice->forceFill(['area_id' => $hackney->id])->save();

        $this->as($this->admin())->getJson('/api/admin/areas?country_code=GB&q=hack')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Hackney')
            ->assertJsonPath('data.0.members_count', 1);
    }
}
