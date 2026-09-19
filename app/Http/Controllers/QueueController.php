<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\QueueConflictException;
use App\Http\Requests\QueueActionRequest;
use App\Http\Requests\TakeQueueNumberRequest;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Models\User;
use App\Services\QueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

final class QueueController extends Controller
{
    public function take(TakeQueueNumberRequest $request, QueueService $queues): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');
        $entry = $queues->take(
            $request->file('photo'),
            $request->string('request_id')->toString(),
            $device,
        );

        return response()->json(['data' => $this->entryPayload($entry)], 201);
    }

    public function callNext(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $counter = $request->validated('counter');
            $counter = is_string($counter) && $counter !== '' ? $counter : '1';
            $queues->callNext($counter, $user);

            return back()->with('success', 'Nomor berikutnya dipanggil.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function recall(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $queues->recall($user);

            return back()->with('success', 'Panggilan diulang.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function serve(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $queues->startServing($user);

            return back()->with('success', 'Nomor ditandai sedang dilayani.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function complete(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $queues->complete($user);

            return back()->with('success', 'Nomor selesai dilayani.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function skip(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $queues->skip($user);

            return back()->with('success', 'Nomor dilewati.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function reset(QueueActionRequest $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $queues->reset($user);

            return back()->with('success', 'Antrian direset. Nomor baru dimulai dari awal.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    private function conflict(QueueActionRequest $request, QueueConflictException $exception): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        return back()->withErrors(['queue' => $exception->getMessage()]);
    }

    /** @return array<string, string|null> */
    private function entryPayload(QueueEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'number' => $entry->number,
            'status' => $entry->status->value,
            'created_at' => $entry->created_at?->toISOString(),
            'called_at' => $entry->called_at?->toISOString(),
            'counter' => $entry->counter?->name,
        ];
    }
}
