<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\ForfeitQueueData;
use App\Data\QueueActionData;
use App\Data\TakeQueueNumberData;
use App\Enums\QueueStatus;
use App\Exceptions\QueueConflictException;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Services\QueueService;
use App\Services\QueueStateService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class QueueController extends Controller
{
    public function take(
        TakeQueueNumberData $data,
        Request $request,
        QueueService $queues,
        QueueStateService $state,
    ): JsonResponse {
        $entry = $queues->take(
            $data->photo,
            $data->requestId,
            $this->device($request),
        );

        return response()->json(['data' => $state->entry($entry)], 201);
    }

    public function photo(QueueEntry $entry): StreamedResponse
    {
        $session = $entry->session()->firstOrFail();
        $photoPath = $entry->photo_path;

        if (
            $photoPath === null
            || $session->active_key !== now()->toDateString()
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
        return $this->run(
            $request,
            fn () => $queues->callNext($data->counter, $this->device($request)),
            'Nomor berikutnya dipanggil.',
        );
    }

    public function recall(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->recall($data->counter, $data->entryId, $this->device($request)),
            'Nomor dipanggil kembali.',
        );
    }

    public function serve(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->startServing($this->device($request), $data->counter),
            'Nomor ditandai sedang dilayani.',
        );
    }

    public function complete(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->complete($this->device($request), $data->counter),
            'Nomor selesai dilayani.',
        );
    }

    public function skip(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->skip($this->device($request), $data->counter),
            'Nomor dilewati.',
        );
    }

    public function forfeit(ForfeitQueueData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->forfeit(
                $data->counter,
                $data->entryId,
                $data->reason,
                $this->device($request),
            ),
            'Nomor dihanguskan.',
        );
    }

    public function reset(QueueActionData $data, Request $request, QueueService $queues): RedirectResponse|JsonResponse
    {
        return $this->run(
            $request,
            fn () => $queues->reset($this->device($request)),
            'Antrian direset. Nomor baru dimulai dari awal.',
        );
    }

    /**
     * @param  Closure(): mixed  $operation
     */
    private function run(Request $request, Closure $operation, string $success): RedirectResponse|JsonResponse
    {
        try {
            $operation();

            return back()->with('success', $success);
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
}
