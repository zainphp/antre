<?php

namespace App\Http\Controllers;

use App\Services\QueueService;
use Illuminate\Http\JsonResponse;

final class PublicController extends Controller
{
    public function queueState(QueueService $queues): JsonResponse
    {
        return response()->json(['data' => $queues->state()]);
    }
}
