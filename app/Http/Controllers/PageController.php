<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\Setting;
use App\Services\QueueStateService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PageController extends Controller
{
    public function display(QueueStateService $queues): Response
    {
        return Inertia::render('display', [
            'state' => $queues->state(),
            'brandName' => Setting::current()->brand_name,
        ]);
    }

    public function queueTerminal(): Response
    {
        $settings = Setting::current();

        return Inertia::render('queue-terminal', [
            'brandName' => $settings->brand_name,
            'sessionName' => $settings->session_name,
            'photoRequired' => $settings->photo_required,
        ]);
    }

    public function queueTerminalSettings(): Response
    {
        $settings = Setting::current();

        return Inertia::render('queue-terminal-settings', [
            'brandName' => $settings->brand_name,
            'sessionName' => $settings->session_name,
        ]);
    }

    public function operatorTerminal(Request $request, QueueStateService $queues): Response
    {
        $settings = Setting::current();
        $device = $request->attributes->get('device');

        return Inertia::render('operator-terminal', [
            'state' => $queues->state(
                includeCallable: true,
                includePhoto: true,
                includeHistory: true,
            ),
            'counters' => $settings->counterNames(),
            'canOpenQueueTerminal' => $device instanceof Device && $device->hasRole(DeviceRole::QueueTerminal),
            'canOpenDisplay' => $device instanceof Device && $device->hasRole(DeviceRole::Display),
        ]);
    }
}
