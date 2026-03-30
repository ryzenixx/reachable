<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Subscriber;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('confirms a subscriber token only once', function (): void {
    $organization = Organization::factory()->create();

    /** @var Subscriber $subscriber */
    $subscriber = Subscriber::factory()
        ->for($organization)
        ->create([
            'confirmed_at' => null,
        ]);

    $confirmEndpoint = sprintf('/api/v1/public/subscribe/confirm/%s', $subscriber->token);

    $this->postJson($confirmEndpoint)
        ->assertOk()
        ->assertJson([
            'message' => 'Subscription confirmed.',
        ]);

    $subscriber->refresh();
    expect($subscriber->confirmed_at)->not->toBeNull();

    $this->postJson($confirmEndpoint)
        ->assertStatus(410)
        ->assertJson([
            'message' => 'This confirmation link is invalid or already used.',
        ]);
});

it('returns not found for an unknown subscriber confirmation token', function (): void {
    Organization::factory()->create();

    $this->postJson('/api/v1/public/subscribe/confirm/unknown-token')
        ->assertNotFound()
        ->assertJson([
            'message' => 'This confirmation link is invalid or already used.',
        ]);
});
