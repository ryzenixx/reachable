<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Subscriber;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Subscriber>
 */
class SubscriberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'email' => fake()->unique()->safeEmail(),
            'token' => Str::random(48),
            'confirmed_at' => fake()->boolean(80) ? now()->subHours(fake()->numberBetween(1, 48)) : null,
            'created_at' => now()->subDays(fake()->numberBetween(0, 30)),
        ];
    }
}
