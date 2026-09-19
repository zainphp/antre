<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Events\DeviceChanged;
use App\Http\Requests\AssignDeviceRequest;
use App\Models\Device;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function assign(AssignDeviceRequest $request, Device $device, AuditLogger $audit): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $role = DeviceRole::from($request->string('role')->toString());

        $device->update([
            'name' => $request->string('name')->toString(),
            'role' => $role,
            'status' => DeviceStatus::Registered,
            'registered_at' => $device->registered_at ?? now(),
            'revoked_at' => null,
        ]);
        $audit->record('device.registered', user: $user, device: $device, subject: $device, metadata: ['role' => $role->value]);
        event(new DeviceChanged($device));

        return back()->with('success', 'Perangkat berhasil didaftarkan.');
    }

    public function revoke(Request $request, Device $device, AuditLogger $audit): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
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
