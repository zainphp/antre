<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\QueueActionData;
use App\Data\TakeQueueNumberData;
use App\Enums\QueueStatus;
use App\Exceptions\QueueConflictException;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Services\QueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class QueueController extends Controller
{
    public function take(TakeQueueNumberData $data, Request $request, QueueService $queues): JsonResponse
    {
        $entry = $queues->take(
            $data->photo,
            $data->requestId,
            $this->device($request),
        );

        return response()->json(['data' => $this->entryPayload($entry)], 201);
    }

    public function photo(QueueEntry $entry): StreamedResponse
    {
        $session = $entry->session()->firstOrFail();
        $photoPath = $entry->photo_path;

        if (
            $photoPath === null
            || $session->active_key !== now()->toDateString()
            || $session->current_entry_id !== $entry->id
            || ! in_array($entry->status, [QueueStatus::Called, QueueStatus::Serving], true)
            || ! Storage::disk('local')->exists($photoPath)
        ) {
            abort(404);
        }

        return Storage::disk('local')->response($photoPath, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function callNext(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->callNext($data->counter, $this->device($request));

            return back()->with('success', 'Nomor berikutnya dipanggil.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function recall(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->recall($data->counter, $data->entryId, $this->device($request));

            return back()->with('success', 'Nomor dipanggil kembali.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function serve(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->startServing($this->device($request));

            return back()->with('success', 'Nomor ditandai sedang dilayani.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function complete(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->complete($this->device($request));

            return back()->with('success', 'Nomor selesai dilayani.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function skip(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->skip($this->device($request));

            return back()->with('success', 'Nomor dilewati.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    public function reset(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        try {
            $queues->reset($this->device($request));

            return back()->with('success', 'Antrian direset. Nomor baru dimulai dari awal.');
        } catch (QueueConflictException $exception) {
            return $this->conflict($request, $exception);
        }
    }

    private function conflict(Request $request, QueueConflictException $exception): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        return back()->withErrors(['queue' => $exception->getMessage()]);
    }

    private function device(Request $request): Device
    {
        $device = $request->attributes->get('device');
        abort_unless($device instanceof Device, 403);

        return $device;
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
