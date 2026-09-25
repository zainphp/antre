<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Models\Device;
use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;

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
        #[LiteralTypeScriptType('App.Enums.DeviceRole[]')]
        public array $roles,
        #[MapOutputName('role_labels')]
        public array $roleLabels,
        public DeviceStatus $status,
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
            status: $device->status,
            registeredAt: $device->registered_at?->toISOString(),
            lastSeenAt: $device->last_seen_at?->toISOString(),
            revokedAt: $device->revoked_at?->toISOString(),
        );
    }
}
