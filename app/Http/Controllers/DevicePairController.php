<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\Frontend\PairDeviceData;
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

        return Inertia::render('pair', [
            'device' => PairDeviceData::fromModel($result['device'])->toArray(),
        ]);
    }
}
