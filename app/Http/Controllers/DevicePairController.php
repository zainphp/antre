<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\DeviceChanged;
use App\Services\DeviceRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Inertia\Inertia;
use Inertia\Response;

final class DevicePairController extends Controller
{
    public function show(Request $request, DeviceRegistry $registry): Response
    {
        $result = $registry->bootstrap($request);
        if ($result['cookie']) {
            Cookie::queue($result['cookie']);
            event(new DeviceChanged($result['device']));
        }

        $device = $result['device'];

        return Inertia::render('pair', [
            'device' => [
                'id' => $device->id,
                'label' => 'KBS-'.strtoupper(substr(str_replace('-', '', $device->id), 0, 4)),
                'name' => $device->name,
                'role' => $device->role?->value,
                'status' => $device->status->value,
            ],
        ]);
    }
}
