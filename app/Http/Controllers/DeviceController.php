<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\AssignDeviceData;
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
        $device->update([
            'name' => $data->name,
            'role' => $data->role,
            'status' => DeviceStatus::Registered,
            'registered_at' => $device->registered_at ?? now(),
            'revoked_at' => null,
        ]);
        $audit->record('device.registered', user: $user, device: $device, subject: $device, metadata: ['role' => $data->role->value]);
        event(new DeviceChanged($device));

        return back()->with('success', 'Perangkat berhasil didaftarkan.');
    }

    public function revoke(Device $device, #[CurrentUser] User $user, AuditLogger $audit): RedirectResponse
    {
        $device->update([
            'role' => null,
            'status' => DeviceStatus::Revoked,
            'revoked_at' => now(),
        ]);
        $audit->record('device.revoked', user: $user, device: $device, subject: $device);
        event(new DeviceChanged($device));

        return back()->with('success', 'Akses perangkat telah dicabut.');
    }

    /** @return array<string, string|null> */
    private function payload(Device $device): array
    {
        return [
            'id' => $device->id,
            'label' => 'KBS-'.strtoupper(substr(str_replace('-', '', $device->id), 0, 4)),
            'name' => $device->name,
            'role' => $device->role?->value,
            'role_label' => $device->role?->label(),
            'status' => $device->status->value,
            'registered_at' => $device->registered_at?->toISOString(),
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'revoked_at' => $device->revoked_at?->toISOString(),
        ];
    }
}
