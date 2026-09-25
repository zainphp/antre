<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use Spatie\LaravelData\Data;

final class QueueStatsData extends Data
{
    public function __construct(
        public int $total,
        public int $waiting,
        public int $completed,
        public int $skipped,
        public int $forfeited,
    ) {}
}
