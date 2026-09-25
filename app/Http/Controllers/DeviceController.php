<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\Frontend\DeviceData;
use App\Data\Payload\AssignDevicePayload;
use App\Enums\DeviceStatus;
use App\Models\Device;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\DeviceService;
use App\Services\PairingSession;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class DeviceController extends Controller
{
    public function index(PairingSession $pairing): Response
    {
        return Inertia::render('admin/devices', [
            'devices' => Device::query()->latest('created_at')->get()->map(
                fn (Device $device): array => DeviceData::fromModel($device)->toArray(),
            )->values(),
            'pairing' => $pairing->state(),
        ]);
    }

    public function openPairingSession(
        #[CurrentUser] User $user,
        PairingSession $pairing,
        AuditLogger $audit,
    ): RedirectResponse {
        $expiresAt = $pairing->open();
        $audit->record(
            'device.pairing_session.opened',
            user: $user,
            metadata: ['expires_at' => $expiresAt->toISOString()],
        );

        return back()->with('success', 'Sesi pairing dibuka selama 60 detik.');
    }

    public function closePairingSession(
        #[CurrentUser] User $user,
        PairingSession $pairing,
        AuditLogger $audit,
    ): RedirectResponse {
        $wasOpen = $pairing->isOpen();
        $pairing->close();

        if ($wasOpen) {
            $audit->record('device.pairing_session.closed', user: $user);
        }

        return back()->with('success', 'Sesi pairing ditutup.');
    }

    public function assign(AssignDevicePayload $data, Device $device, #[CurrentUser] User $user, DeviceService $devices): RedirectResponse
    {
        $devices->assign($device, $data, $user);

        return back()->with('success', 'Perangkat berhasil didaftarkan.');
    }

    public function revoke(Device $device, #[CurrentUser] User $user, DeviceService $devices): RedirectResponse
    {
        $devices->revoke($device, $user);

        return back()->with('success', 'Akses perangkat telah dicabut.');
    }

    public function destroy(Device $device, #[CurrentUser] User $user, DeviceService $devices): RedirectResponse
    {
        if ($device->status === DeviceStatus::Registered) {
            return back()->withErrors([
                'device' => 'Cabut akses perangkat sebelum menghapusnya.',
            ]);
        }

        $devices->delete($device, $user);

        return back()->with('success', 'Perangkat dihapus dari daftar aktif.');
    }
}
