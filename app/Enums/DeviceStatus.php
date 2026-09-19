<?php

namespace App\Enums;

enum DeviceStatus: string
{
    case Unregistered = 'UNREGISTERED';
    case Registered = 'REGISTERED';
    case Revoked = 'REVOKED';
}
