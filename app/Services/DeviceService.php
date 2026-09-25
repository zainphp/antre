<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Payload\AssignDevicePayload;
use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Events\DeviceChanged;
use App\Models\Device;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final readonly class DeviceService
{
    public function __construct(private AuditLogger $audit) {}

    public function assign(Device $device, AssignDevicePayload $data, User $user): void
    {
        $roles = array_map(
            static fn (DeviceRole|string $role): string => $role instanceof DeviceRole
                ? $role->value
                : DeviceRole::from($role)->value,
            $data->roles,
        );

        $device->update([
            'name' => $data->name,
            'roles' => $roles,
            'status' => DeviceStatus::Registered,
            'registered_at' => $device->registered_at ?? now(),
            'revoked_at' => null,
        ]);
        $this->audit->record(
            'device.registered',
            user: $user,
            device: $device,
            subject: $device,
            metadata: ['roles' => $roles],
        );
        event(new DeviceChanged($device));
    }

    public function revoke(Device $device, User $user): void
    {
        $device->update([
            'roles' => [],
            'status' => DeviceStatus::Revoked,
            'revoked_at' => now(),
        ]);
        $this->audit->record('device.revoked', user: $user, device: $device, subject: $device);
        event(new DeviceChanged($device));
    }

    public function delete(Device $device, User $user): void
    {
        DB::transaction(function () use ($device, $user): void {
            $hardDeleted = false;

            if (! $device->auditEvents()->exists() && ! $device->queueEntries()->exists()) {
                try {
                    $device->forceDelete();
                    $hardDeleted = true;
                } catch (QueryException $exception) {
                    if (! $this->isForeignKeyViolation($exception)) {
                        throw $exception;
                    }
                }
            }

            if (! $hardDeleted) {
                $device->delete();
            }

            $this->audit->record(
                'device.deleted',
                user: $user,
                device: $hardDeleted ? null : $device,
                subject: $device,
                metadata: ['hard_deleted' => $hardDeleted],
            );
        });
        event(new DeviceChanged($device));
    }

    private function isForeignKeyViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['23000', '23503'], true);
    }
}
