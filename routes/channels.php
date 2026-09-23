<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('admin.devices', fn (User $user): bool => $user->isAdministrator());
Broadcast::channel('admin.integrations', fn (User $user): bool => $user->isAdministrator());
