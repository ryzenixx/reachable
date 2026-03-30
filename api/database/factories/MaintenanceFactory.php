<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MaintenanceStatus;
use App\Models\Maintenance;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Maintenance>
 */
class MaintenanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(MaintenanceStatus::cases());
        $scheduledAt = now()->addDays(fake()->numberBetween(-1, 10))->addHours(fake()->numberBetween(1, 10));

        return [
            'organization_id' => Organization::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'scheduled_at' => $scheduledAt,
            'ended_at' => $status === MaintenanceStatus::Completed ? $scheduledAt->clone()->addHours(1) : null,
            'status' => $status,
        ];
    }
}
