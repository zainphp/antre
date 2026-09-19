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
            'roles' => [DeviceRole::Display->value],
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
            'roles' => [],
            'status' => DeviceStatus::Unregistered,
            'registered_at' => null,
            'revoked_at' => null,
        ]);
    }

    public function roles(DeviceRole ...$roles): static
    {
        return $this->state(fn (array $attributes): array => [
            'roles' => array_map(
                static fn (DeviceRole $role): string => $role->value,
                $roles,
            ),
        ]);
    }
}
