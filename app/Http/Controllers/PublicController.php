<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\QueueStateService;
use Illuminate\Http\JsonResponse;

final class PublicController extends Controller
{
    public function queueState(QueueStateService $queues): JsonResponse
    {
        return response()->json(['data' => $queues->state()]);
    }
}
