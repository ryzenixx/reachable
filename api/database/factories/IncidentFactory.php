<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Models\Incident;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incident>
 */
class IncidentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(IncidentStatus::cases());

        return [
            'organization_id' => Organization::factory(),
            'title' => fake()->sentence(4),
            'status' => $status,
            'impact' => fake()->randomElement(IncidentImpact::cases()),
            'resolved_at' => $status === IncidentStatus::Resolved ? now()->subMinutes(fake()->numberBetween(1, 180)) : null,
        ];
    }
}
