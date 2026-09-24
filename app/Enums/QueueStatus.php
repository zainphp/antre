<?php

declare(strict_types=1);

namespace App\Enums;

enum QueueStatus: string
{
    case Waiting = 'WAITING';
    case Called = 'CALLED';
    case Serving = 'SERVING';
    case Completed = 'COMPLETED';
    case Skipped = 'SKIPPED';

    public function isActive(): bool
    {
        return match ($this) {
            self::Called, self::Serving => true,
            default => false,
        };
    }

    public function canBeCalled(): bool
    {
        return match ($this) {
            self::Waiting, self::Skipped => true,
            default => false,
        };
    }

    public function isFinal(): bool
    {
        return match ($this) {
            self::Completed, self::Skipped => true,
            default => false,
        };
    }
}
