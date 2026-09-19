<?php

namespace App\Enums;

enum QueueStatus: string
{
    case Waiting = 'WAITING';
    case Called = 'CALLED';
    case Serving = 'SERVING';
    case Completed = 'COMPLETED';
    case Skipped = 'SKIPPED';
}
