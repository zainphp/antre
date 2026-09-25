<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Frontend\QueueCounterData;
use App\Data\Frontend\QueueEntryData;
use App\Data\Frontend\QueueHistoryEntryData;
use App\Data\Frontend\QueueSessionData;
use App\Data\Frontend\QueueStateData;
use App\Data\Frontend\QueueStatsData;
use App\Enums\QueueStatus;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Models\Setting;
use Spatie\LaravelData\Optional;

final class QueueStateService
{
    /** @return array<array-key, mixed> */
    public function entry(QueueEntry $entry): array
    {
        return QueueEntryData::fromModel($entry)->toArray();
    }

    /**
     * @return array<array-key, mixed>
     */
    public function state(
        bool $includeCallable = false,
        bool $includePhoto = false,
        int $waitingLimit = 20,
        bool $includeHistory = false,
    ): array {
        $settings = Setting::current();
        $session = QueueSession::query()
            ->where('active_key', now()->toDateString())
            ->first();

        if ($session === null) {
            return $this->emptyState(
                $settings->session_name,
                $settings->counterNames(),
                $includeCallable,
                $includeHistory,
            );
        }

        $session->load(['currentEntry.counter']);
        $counterNames = $settings->counterNames();
        $activeEntries = $session->entries()
            ->with('counter')
            ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
            ->whereNotNull('counter_id')
            ->latest('called_at')
            ->orderByDesc('sequence')
            ->get();

        /** @var array<string, QueueEntry> $activeEntriesByCounter */
        $activeEntriesByCounter = [];
        foreach ($activeEntries as $entry) {
            $counterName = $entry->counter?->name;
            if ($counterName !== null) {
                $activeEntriesByCounter[$counterName] ??= $entry;
            }
        }

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
        if (! $current?->status?->isActive()) {
            $current = $session->entries()
                ->with('counter')
                ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
                ->latest('called_at')
                ->orderByDesc('sequence')
                ->first();
        }

        $callable = Optional::create();
        if ($includeCallable) {
            $callable = array_values(
                $session->entries()
                    ->with('counter')
                    ->whereIn('status', [
                        QueueStatus::Waiting->value,
                        QueueStatus::Called->value,
                        QueueStatus::Serving->value,
                        QueueStatus::Skipped->value,
                    ])
                    ->orderBy('sequence')
                    ->get()
                    ->map(fn (QueueEntry $entry): QueueEntryData => QueueEntryData::fromModel(
                        $entry,
                        includePhoto: $includePhoto && $entry->status->isActive(),
                    ))
                    ->all(),
            );
        }

        $history = $includeHistory
            ? array_values(
                $session->entries()
                    ->with('counter')
                    ->orderByDesc('sequence')
                    ->get()
                    ->map(fn (QueueEntry $entry): QueueHistoryEntryData => QueueHistoryEntryData::fromHistory($entry))
                    ->all(),
            )
            : Optional::create();

        return (new QueueStateData(
            session: new QueueSessionData(
                date: $session->business_date->format('Y-m-d'),
                serviceName: $settings->session_name,
            ),
            current: $current?->status?->isActive()
                ? QueueEntryData::fromModel($current, includePhoto: $includePhoto)
                : null,
            counters: array_map(
                function (string $name) use ($activeEntriesByCounter): QueueCounterData {
                    $entry = $activeEntriesByCounter[$name] ?? null;

                    return new QueueCounterData(
                        name: $name,
                        current: $entry === null ? null : QueueEntryData::fromModel($entry),
                    );
                },
                $counterNames,
            ),
            waiting: array_values(
                $waiting->map(fn (QueueEntry $entry): QueueEntryData => QueueEntryData::fromModel($entry))->all(),
            ),
            stats: new QueueStatsData(
                total: $session->entries()->count(),
                waiting: $waitingCount,
                completed: $session->entries()->where('status', QueueStatus::Completed)->count(),
                skipped: $session->entries()->where('status', QueueStatus::Skipped)->count(),
                forfeited: $session->entries()->where('status', QueueStatus::Forfeited)->count(),
            ),
            callable: $callable,
            history: $history,
        ))->toArray();
    }

    /**
     * @param  non-empty-list<string>  $counterNames
     * @return array<array-key, mixed>
     */
    private function emptyState(
        string $sessionName,
        array $counterNames,
        bool $includeCallable,
        bool $includeHistory,
    ): array {
        return (new QueueStateData(
            session: new QueueSessionData(
                date: now()->toDateString(),
                serviceName: $sessionName,
            ),
            current: null,
            counters: array_map(
                static fn (string $name): QueueCounterData => new QueueCounterData(
                    name: $name,
                    current: null,
                ),
                $counterNames,
            ),
            waiting: [],
            stats: new QueueStatsData(
                total: 0,
                waiting: 0,
                completed: 0,
                skipped: 0,
                forfeited: 0,
            ),
            callable: $includeCallable ? [] : Optional::create(),
            history: $includeHistory ? [] : Optional::create(),
        ))->toArray();
    }
}
