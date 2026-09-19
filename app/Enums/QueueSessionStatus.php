<?php

declare(strict_types=1);

namespace App\Enums;

enum QueueSessionStatus: string
{
    case Running = 'RUNNING';
    case Ended = 'ENDED';
}
