<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use Spatie\LaravelData\Data;

final class QueueCounterData extends Data
{
    public function __construct(
        public string $name,
        public ?QueueEntryData $current,
    ) {}
}
