<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\Setting;
use App\Services\QueueService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PageController extends Controller
{
    public function display(QueueService $queues): Response
    {
        return Inertia::render('display', [
            'state' => $queues->state(),
            'brandName' => Setting::current()->brand_name,
        ]);
    }

    public function queueTerminal(QueueService $queues): Response
    {
        return Inertia::render('queue-terminal', [
            'state' => $queues->state(),
            'brandName' => Setting::current()->brand_name,
        ]);
    }

    public function operatorTerminal(Request $request, QueueService $queues): Response
    {
        $settings = Setting::current();
        $device = $request->attributes->get('device');

        return Inertia::render('operator-terminal', [
            'state' => $queues->state(),
            'counters' => $settings->counterNames(),
            'canOpenQueueTerminal' => $device instanceof Device && $device->hasRole(DeviceRole::QueueTerminal),
            'canOpenDisplay' => $device instanceof Device && $device->hasRole(DeviceRole::Display),
        ]);
    }
}
