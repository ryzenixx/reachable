<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MonitorMethod;
use App\Enums\MonitorType;
use App\Models\Monitor;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Monitor>
 */
class MonitorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(MonitorType::cases());

        return [
            'service_id' => Service::factory(),
            'type' => $type,
            'url' => $type === MonitorType::Http ? fake()->url() : fake()->domainName(),
            'method' => fake()->randomElement(MonitorMethod::cases()),
            'interval_seconds' => fake()->randomElement([30, 60, 120, 300]),
            'timeout_ms' => fake()->randomElement([1000, 3000, 5000]),
            'expected_status_code' => 200,
            'is_active' => fake()->boolean(90),
        ];
    }
}
