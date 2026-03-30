<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns uninitialized onboarding state on a fresh install', function (): void {
    $this->getJson('/api/v1/onboarding/state')
        ->assertOk()
        ->assertJson([
            'initialized' => false,
        ]);
});

it('bootstraps the first organization and owner account', function (): void {
    $response = $this->postJson('/api/v1/onboarding/bootstrap', [
        'organization_name' => 'Acme Status',
        'owner_name' => 'Jane Doe',
        'owner_email' => 'jane@acme.test',
        'owner_password' => 'super-secret-password',
        'device_name' => 'dashboard',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('user.email', 'jane@acme.test')
        ->assertJsonPath('user.organization.name', 'Acme Status');

    expect(Organization::query()->count())->toBe(1);
    expect(User::query()->count())->toBe(1);

    $this->assertDatabaseHas('users', [
        'email' => 'jane@acme.test',
        'role' => UserRole::Owner->value,
    ]);

    $this->getJson('/api/v1/onboarding/state')
        ->assertOk()
        ->assertJson([
            'initialized' => true,
        ]);
});

it('prevents onboarding bootstrap after initialization', function (): void {
    $organization = Organization::factory()->create();

    User::factory()->for($organization)->create([
        'role' => UserRole::Owner,
    ]);

    $this->postJson('/api/v1/onboarding/bootstrap', [
        'organization_name' => 'Another Org',
        'owner_name' => 'John Smith',
        'owner_email' => 'john@example.com',
        'owner_password' => 'super-secret-password',
    ])->assertStatus(409);
});
