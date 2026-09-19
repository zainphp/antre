<?php

namespace App\Enums;

enum UserRole: string
{
    case Administrator = 'ADMINISTRATOR';
    case Operator = 'OPERATOR';
}
