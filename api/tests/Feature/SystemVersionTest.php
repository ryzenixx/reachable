<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('returns current and latest versions for authenticated users', function (): void {
    Config::set('version.current', '1.0.0');
    Config::set('version.update_check.enabled', true);
    Config::set('version.update_check.repository', 'ryzenixx/reachable');
    Config::set('version.update_check.cache_ttl_seconds', 60);

    Http::fake([
        'https://api.github.com/repos/ryzenixx/reachable/releases/latest' => Http::response([
            'tag_name' => 'v1.1.0',
            'html_url' => 'https://github.com/ryzenixx/reachable/releases/tag/v1.1.0',
        ], 200),
    ]);

    $organization = Organization::factory()->create();
    $user = User::factory()->for($organization)->create([
        'role' => UserRole::Owner,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/dashboard/system/version')
        ->assertOk()
        ->assertJsonPath('data.current_version', '1.0.0')
        ->assertJsonPath('data.latest_version', '1.1.0')
        ->assertJsonPath('data.latest_release_url', 'https://github.com/ryzenixx/reachable/releases/tag/v1.1.0')
        ->assertJsonPath('data.update_available', true)
        ->assertJsonPath('data.update_check_enabled', true);

    $checkedAt = $response->json('data.checked_at');

    expect(is_string($checkedAt))->toBeTrue();
    expect($checkedAt)->not->toBe('');
});

it('returns disabled update-check payload when update checks are disabled', function (): void {
    Config::set('version.current', '1.0.0');
    Config::set('version.update_check.enabled', false);

    $organization = Organization::factory()->create();
    $user = User::factory()->for($organization)->create([
        'role' => UserRole::Owner,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/dashboard/system/version')
        ->assertOk()
        ->assertJsonPath('data.current_version', '1.0.0')
        ->assertJsonPath('data.latest_version', null)
        ->assertJsonPath('data.latest_release_url', null)
        ->assertJsonPath('data.update_available', false)
        ->assertJsonPath('data.update_check_enabled', false)
        ->assertJsonPath('data.checked_at', null);
});
