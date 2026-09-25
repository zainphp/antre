<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Data;

final class QueueSessionData extends Data
{
    public function __construct(
        public string $date,
        #[MapOutputName('service_name')]
        public string $serviceName,
    ) {}
}
