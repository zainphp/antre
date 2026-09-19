<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('admin.devices', fn (User $user): bool => $user->isAdministrator());
