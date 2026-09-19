<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\AssignDeviceData;
use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Events\DeviceChanged;
use App\Models\Device;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class DeviceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/devices', [
            'devices' => Device::query()->latest('created_at')->get()->map(
                fn (Device $device): array => $this->payload($device),
            )->values(),
        ]);
    }

    public function assign(AssignDeviceData $data, Device $device, #[CurrentUser] User $user, AuditLogger $audit): RedirectResponse
    {
        $roles = array_map(
            static fn (DeviceRole|string $role): string => $role instanceof DeviceRole ? $role->value : DeviceRole::from($role)->value,
            $data->roles,
        );

        $device->update([
            'name' => $data->name,
            'roles' => $roles,
            'status' => DeviceStatus::Registered,
            'registered_at' => $device->registered_at ?? now(),
            'revoked_at' => null,
        ]);
        $audit->record('device.registered', user: $user, device: $device, subject: $device, metadata: ['roles' => $roles]);
        event(new DeviceChanged($device));

        return back()->with('success', 'Perangkat berhasil didaftarkan.');
    }

    public function revoke(Device $device, #[CurrentUser] User $user, AuditLogger $audit): RedirectResponse
    {
        $device->update([
            'roles' => [],
            'status' => DeviceStatus::Revoked,
            'revoked_at' => now(),
        ]);
        $audit->record('device.revoked', user: $user, device: $device, subject: $device);
        event(new DeviceChanged($device));

        return back()->with('success', 'Akses perangkat telah dicabut.');
    }

    /** @return array<string, mixed> */
    private function payload(Device $device): array
    {
        $roles = $device->assignedRoles();

        return [
            'id' => $device->id,
            'label' => 'KBS-'.strtoupper(substr(str_replace('-', '', $device->id), 0, 4)),
            'name' => $device->name,
            'roles' => array_map(static fn (DeviceRole $role): string => $role->value, $roles),
            'role_labels' => array_map(static fn (DeviceRole $role): string => $role->label(), $roles),
            'status' => $device->status->value,
            'registered_at' => $device->registered_at?->toISOString(),
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'revoked_at' => $device->revoked_at?->toISOString(),
        ];
    }
}
