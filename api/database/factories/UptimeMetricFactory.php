<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Service;
use App\Models\UptimeMetric;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UptimeMetric>
 */
class UptimeMetricFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_id' => Service::factory(),
            'date' => now()->subDays(fake()->numberBetween(0, 89))->toDateString(),
            'uptime_percentage' => fake()->randomFloat(2, 97.50, 100.00),
            'avg_response_time_ms' => fake()->numberBetween(40, 1200),
        ];
    }
}
