<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'logo_url' => fake()->optional(0.4)->imageUrl(128, 128, 'business'),
            'banner_url' => fake()->optional(0.3)->imageUrl(1400, 360, 'business'),
            'custom_domain' => fake()->optional(0.2)->domainName(),
            'smtp_enabled' => false,
            'smtp_host' => null,
            'smtp_port' => null,
            'smtp_username' => null,
            'smtp_password' => null,
            'smtp_encryption' => null,
            'smtp_from_address' => null,
            'smtp_from_name' => null,
        ];
    }
}
