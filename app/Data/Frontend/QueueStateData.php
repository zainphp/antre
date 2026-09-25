<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

final class QueueStateData extends Data
{
    /**
     * @param  list<QueueCounterData>  $counters
     * @param  list<QueueEntryData>  $waiting
     * @param  list<QueueEntryData>|Optional  $callable
     * @param  list<QueueHistoryEntryData>|Optional  $history
     */
    public function __construct(
        public QueueSessionData $session,
        public ?QueueEntryData $current,
        public array $counters,
        public array $waiting,
        public QueueStatsData $stats,
        public array|Optional $callable,
        public array|Optional $history,
    ) {}
}
