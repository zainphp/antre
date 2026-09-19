<?php

namespace App\Http\Controllers;

use App\Models\Counter;
use App\Services\QueueService;
use Inertia\Inertia;
use Inertia\Response;

final class PageController extends Controller
{
    public function display(QueueService $queues): Response
    {
        return Inertia::render('display', ['state' => $queues->state()]);
    }

    public function queueTerminal(QueueService $queues): Response
    {
        return Inertia::render('queue-terminal', ['state' => $queues->state()]);
    }

    public function operatorTerminal(QueueService $queues): Response
    {
        return Inertia::render('operator-terminal', [
            'state' => $queues->state(),
            'counters' => Counter::query()->where('active', true)->orderBy('name')->pluck('name')->values(),
        ]);
    }
}
