<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\QueueStatus;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Models\Setting;

final class QueueStateService
{
    /** @return array<string, mixed> */
    public function entry(QueueEntry $entry): array
    {
        return $this->entryPayload($entry);
    }

    /**
     * @return array<string, mixed>
     */
    public function state(
        bool $includeCallable = false,
        bool $includePhoto = false,
        int $waitingLimit = 20,
    ): array {
        $settings = Setting::current();
        $session = QueueSession::query()
            ->where('active_key', now()->toDateString())
            ->first();

        if ($session === null) {
            return $this->emptyState($settings->session_name, $includeCallable);
        }

        $session->load(['currentEntry.counter']);

        $waiting = $session->entries()
            ->with('counter')
            ->where('status', QueueStatus::Waiting)
            ->orderBy('sequence')
            ->limit($waitingLimit)
            ->get();
        $waitingCount = $session->entries()
            ->where('status', QueueStatus::Waiting)
            ->count();
        $current = $session->currentEntry;

        $state = [
            'session' => [
                'date' => $session->business_date->format('Y-m-d'),
                'service_name' => $settings->session_name,
            ],
            'current' => $current?->status?->isActive()
                ? $this->entryPayload($current, includePhoto: $includePhoto)
                : null,
            'waiting' => $waiting
                ->map(fn (QueueEntry $entry): array => $this->entryPayload($entry))
                ->values()
                ->all(),
            'stats' => [
                'total' => $session->entries()->count(),
                'waiting' => $waitingCount,
                'completed' => $session->entries()->where('status', QueueStatus::Completed)->count(),
                'skipped' => $session->entries()->where('status', QueueStatus::Skipped)->count(),
            ],
        ];

        if ($includeCallable) {
            $callable = $session->entries()
                ->with('counter')
                ->where('status', '!=', QueueStatus::Completed)
                ->orderBy('sequence')
                ->get();

            $state['callable'] = $callable
                ->map(fn (QueueEntry $entry): array => $this->entryPayload($entry))
                ->values()
                ->all();
        }

        return $state;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyState(string $sessionName, bool $includeCallable): array
    {
        $state = [
            'session' => [
                'date' => now()->toDateString(),
                'service_name' => $sessionName,
            ],
            'current' => null,
            'waiting' => [],
            'stats' => [
                'total' => 0,
                'waiting' => 0,
                'completed' => 0,
                'skipped' => 0,
            ],
        ];

        if ($includeCallable) {
            $state['callable'] = [];
        }

        return $state;
    }

    /** @return array<string, mixed> */
    private function entryPayload(QueueEntry $entry, bool $includePhoto = false): array
    {
        $payload = [
            'id' => $entry->id,
            'number' => $entry->number,
            'status' => $entry->status->value,
            'counter' => $entry->counter?->name,
            'created_at' => $entry->created_at?->toISOString(),
            'called_at' => $entry->called_at?->toISOString(),
        ];

        if ($includePhoto && $entry->photo_path !== null) {
            $payload['photo_url'] = route(
                'operator.queue.photo',
                ['entry' => $entry->getKey()],
                false,
            );
        }

        return $payload;
    }
}
