<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MonitorCheckStatus;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonitorCheck>
 */
class MonitorCheckFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement([
            MonitorCheckStatus::Up,
            MonitorCheckStatus::Up,
            MonitorCheckStatus::Up,
            MonitorCheckStatus::Degraded,
            MonitorCheckStatus::Down,
        ]);

        return [
            'monitor_id' => Monitor::factory(),
            'status' => $status,
            'response_time_ms' => $status === MonitorCheckStatus::Down ? 0 : fake()->numberBetween(40, 1400),
            'status_code' => $status === MonitorCheckStatus::Down ? null : fake()->randomElement([200, 200, 200, 503, 504]),
            'error_message' => $status === MonitorCheckStatus::Down ? fake()->sentence() : null,
            'checked_at' => now()->subMinutes(fake()->numberBetween(0, 120)),
        ];
    }
}
