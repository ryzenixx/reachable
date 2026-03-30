<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects incident service ids outside the authenticated organization', function (): void {
    $organization = Organization::factory()->create();
    $otherOrganization = Organization::factory()->create();

    $user = User::factory()->for($organization)->create([
        'role' => UserRole::Admin,
    ]);

    $otherService = Service::factory()->for($otherOrganization)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/incidents', [
        'title' => 'Cross-organization incident attempt',
        'status' => 'investigating',
        'impact' => 'major',
        'service_ids' => [$otherService->id],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['service_ids.0']);
});

it('does not expose subscriber unsubscribe tokens in dashboard responses', function (): void {
    $organization = Organization::factory()->create();

    $user = User::factory()->for($organization)->create([
        'role' => UserRole::Owner,
    ]);

    Subscriber::factory()->for($organization)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/dashboard/subscribers')
        ->assertOk()
        ->assertJsonMissingPath('data.0.token');
});

it('rate limits repeated failed login attempts', function (): void {
    $organization = Organization::factory()->create();

    User::factory()->for($organization)->create([
        'email' => 'owner@reachable.test',
        'password' => 'this-is-a-valid-password',
        'role' => UserRole::Owner,
    ]);

    for ($attempt = 1; $attempt <= 6; $attempt++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@reachable.test',
            'password' => 'wrong-password',
            'device_name' => 'dashboard',
        ])->assertStatus(422);
    }

    $this->postJson('/api/v1/auth/login', [
        'email' => 'owner@reachable.test',
        'password' => 'wrong-password',
        'device_name' => 'dashboard',
    ])->assertStatus(429);
});
