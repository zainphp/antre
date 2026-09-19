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
use App\Services\PairingSession;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class DeviceController extends Controller
{
    public function index(PairingSession $pairing): Response
    {
        return Inertia::render('admin/devices', [
            'devices' => Device::query()->latest('created_at')->get()->map(
                fn (Device $device): array => $this->payload($device),
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

    public function destroy(Device $device, #[CurrentUser] User $user, AuditLogger $audit): RedirectResponse
    {
        if ($device->status === DeviceStatus::Registered) {
            return back()->withErrors([
                'device' => 'Cabut akses perangkat sebelum menghapusnya.',
            ]);
        }

        DB::transaction(function () use ($audit, $device, $user): void {
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

            $audit->record(
                'device.deleted',
                user: $user,
                device: $hardDeleted ? null : $device,
                subject: $device,
                metadata: ['hard_deleted' => $hardDeleted],
            );
        });
        event(new DeviceChanged($device));

        return back()->with('success', 'Perangkat dihapus dari daftar aktif.');
    }

    private function isForeignKeyViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['23000', '23503'], true);
    }

    /** @return array<string, mixed> */
    private function payload(Device $device): array
    {
        $roles = $device->assignedRoles();

        return [
            'id' => $device->id,
            'label' => $device->displayId(),
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
