<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ServiceStatus;
use App\Models\Organization;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement([
            ServiceStatus::Operational,
            ServiceStatus::Operational,
            ServiceStatus::Operational,
            ServiceStatus::Degraded,
            ServiceStatus::PartialOutage,
        ]);

        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->words(2, true),
            'description' => fake()->optional(0.8)->sentence(),
            'group' => fake()->randomElement(['Core', 'API', 'Infrastructure', 'Payments', 'Web']),
            'status' => $status,
            'order' => fake()->numberBetween(0, 20),
            'is_public' => fake()->boolean(85),
        ];
    }
}
