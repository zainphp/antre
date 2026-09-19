<?php

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Services\DeviceRegistry;
use App\Services\QueueService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RootController extends Controller
{
    public function __invoke(Request $request, DeviceRegistry $devices, QueueService $queues): Response|RedirectResponse
    {
        $device = $devices->resolve($request);
        if ($device && $device->status !== DeviceStatus::Registered) {
            return redirect()->route('pair');
        }

        if ($device?->role === DeviceRole::Display) {
            return redirect()->route('display');
        }

        if ($device?->role === DeviceRole::QueueTerminal) {
            return redirect()->route('take-number');
        }

        if ($device?->role === DeviceRole::OperatorTerminal) {
            return redirect()->route('operator');
        }

        return Inertia::render('welcome', ['state' => $queues->state()]);
    }
}
