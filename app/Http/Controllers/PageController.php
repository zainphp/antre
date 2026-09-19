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

    public function takeNumber(QueueService $queues): Response
    {
        return Inertia::render('take-number', ['state' => $queues->state()]);
    }

    public function operator(QueueService $queues): Response
    {
        return Inertia::render('operator', [
            'state' => $queues->state(),
            'counters' => Counter::query()->where('active', true)->orderBy('name')->pluck('name')->values(),
        ]);
    }
}
