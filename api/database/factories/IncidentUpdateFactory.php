<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\IncidentStatus;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IncidentUpdate>
 */
class IncidentUpdateFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'incident_id' => Incident::factory(),
            'message' => fake()->paragraph(),
            'status' => fake()->randomElement(IncidentStatus::cases()),
            'created_at' => now()->subMinutes(fake()->numberBetween(0, 180)),
        ];
    }
}
