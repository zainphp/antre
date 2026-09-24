<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DeviceRole;
use App\Models\Device;
use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Data;

final class DeviceData extends Data
{
    /**
     * @param  list<string>  $roles
     * @param  list<string>  $roleLabels
     */
    public function __construct(
        public string $id,
        public string $label,
        public string $name,
        public array $roles,
        #[MapOutputName('role_labels')]
        public array $roleLabels,
        public string $status,
        #[MapOutputName('registered_at')]
        public ?string $registeredAt,
        #[MapOutputName('last_seen_at')]
        public ?string $lastSeenAt,
        #[MapOutputName('revoked_at')]
        public ?string $revokedAt,
    ) {}

    public static function fromModel(Device $device): self
    {
        $roles = $device->assignedRoles();

        return new self(
            id: $device->id,
            label: $device->displayId(),
            name: $device->name,
            roles: array_map(
                static fn (DeviceRole $role): string => $role->value,
                $roles,
            ),
            roleLabels: array_map(
                static fn (DeviceRole $role): string => $role->label(),
                $roles,
            ),
            status: $device->status->value,
            registeredAt: $device->registered_at?->toISOString(),
            lastSeenAt: $device->last_seen_at?->toISOString(),
            revokedAt: $device->revoked_at?->toISOString(),
        );
    }
}
