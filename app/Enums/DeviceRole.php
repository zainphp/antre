<?php

namespace App\Enums;

enum DeviceRole: string
{
    case Display = 'DISPLAY';
    case QueueTerminal = 'QUEUE_TERMINAL';
    case OperatorTerminal = 'OPERATOR_TERMINAL';

    public function label(): string
    {
        return match ($this) {
            self::Display => 'Layar display',
            self::QueueTerminal => 'Terminal ambil nomor',
            self::OperatorTerminal => 'Terminal operator',
        };
    }
}
