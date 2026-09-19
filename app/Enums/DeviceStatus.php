<?php

declare(strict_types=1);

namespace App\Enums;

enum DeviceStatus: string
{
    case Unregistered = 'UNREGISTERED';
    case Registered = 'REGISTERED';
    case Revoked = 'REVOKED';
}
