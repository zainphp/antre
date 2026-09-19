<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
use App\Events\DeviceChanged;
use App\Services\DeviceRegistry;
use App\Services\PairingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Inertia\Inertia;
use Inertia\Response;

final class DevicePairController extends Controller
{
    public function show(Request $request, DeviceRegistry $registry, PairingSession $pairing): Response
    {
        abort_unless($pairing->isOpen(), 403, 'Sesi pairing sedang ditutup.');

        $result = $registry->bootstrap($request);
        if ($result['cookie']) {
            Cookie::queue($result['cookie']);
            event(new DeviceChanged($result['device']));
        }

        $device = $result['device'];
        $roles = $device->assignedRoles();

        return Inertia::render('pair', [
            'device' => [
                'id' => $device->id,
                'label' => $device->displayId(),
                'roles' => array_map(static fn (DeviceRole $role): string => $role->value, $roles),
                'role_labels' => array_map(static fn (DeviceRole $role): string => $role->label(), $roles),
                'status' => $device->status->value,
            ],
        ]);
    }
}
