<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Device>
 */
class DeviceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Perangkat '.fake()->unique()->numerify('####'),
            'role' => DeviceRole::Display,
            'status' => DeviceStatus::Registered,
            'credential_hash' => hash('sha256', Str::random(64)),
            'registered_at' => now(),
            'last_seen_at' => now(),
            'revoked_at' => null,
        ];
    }

    public function unregistered(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => null,
            'status' => DeviceStatus::Unregistered,
            'registered_at' => null,
            'revoked_at' => null,
        ]);
    }

    public function role(DeviceRole $role): static
    {
        return $this->state(fn (array $attributes) => ['role' => $role]);
    }
}
