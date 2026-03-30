<?php

declare(strict_types=1);

use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('returns conflict when smtp is disabled on the public status page', function (): void {
    Mail::fake();

    Organization::factory()->create([
        'smtp_enabled' => false,
    ]);

    $this->postJson('/api/v1/public/subscribe', [
        'email' => 'alerts@example.com',
    ])
        ->assertStatus(409)
        ->assertJson([
            'message' => 'Email updates are not enabled for this status page.',
        ]);
});

it('accepts subscriptions when smtp is enabled', function (): void {
    Mail::fake();

    Organization::factory()->create([
        'smtp_enabled' => true,
        'smtp_host' => 'smtp.example.com',
        'smtp_port' => 587,
        'smtp_from_address' => 'status@example.com',
    ]);

    $this->postJson('/api/v1/public/subscribe', [
        'email' => 'alerts@example.com',
    ])
        ->assertOk()
        ->assertJsonPath('message', 'Subscription pending confirmation. Check your inbox.')
        ->assertJsonPath('subscriber_id', fn (mixed $value): bool => is_string($value) && $value !== '');
});
