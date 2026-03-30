<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Subscriber;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('unsubscribes a subscriber token only once', function (): void {
    Organization::factory()->create();

    /** @var Subscriber $subscriber */
    $subscriber = Subscriber::factory()->create([
        'confirmed_at' => now(),
    ]);

    $unsubscribeEndpoint = sprintf('/api/v1/public/unsubscribe/%s', $subscriber->token);

    $this->deleteJson($unsubscribeEndpoint)
        ->assertOk()
        ->assertJson([
            'message' => 'You have been unsubscribed.',
        ]);

    $this->assertDatabaseMissing('subscribers', [
        'id' => $subscriber->id,
    ]);

    $this->deleteJson($unsubscribeEndpoint)
        ->assertNotFound()
        ->assertJson([
            'message' => 'This unsubscribe link is invalid or already used.',
        ]);
});

it('returns not found for an unknown unsubscribe token', function (): void {
    Organization::factory()->create();

    $this->deleteJson('/api/v1/public/unsubscribe/unknown-token')
        ->assertNotFound()
        ->assertJson([
            'message' => 'This unsubscribe link is invalid or already used.',
        ]);
});
