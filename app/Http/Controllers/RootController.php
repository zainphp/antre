<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
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
        if (app()->environment('production')) {
            $device = $devices->resolve($request);

            if ($device?->hasRole(DeviceRole::OperatorTerminal)) {
                return redirect()->route('operator-terminal');
            }

            if ($device?->hasRole(DeviceRole::QueueTerminal)) {
                return redirect()->route('queue-terminal');
            }

            if ($device?->hasRole(DeviceRole::Display)) {
                return redirect()->route('display');
            }
        }

        return Inertia::render('welcome', ['state' => $queues->state()]);
    }
}
