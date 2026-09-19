<?php

namespace App\Enums;

enum QueueSessionStatus: string
{
    case Running = 'RUNNING';
    case Ended = 'ENDED';
}
