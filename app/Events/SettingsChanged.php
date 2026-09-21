<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class SettingsChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function broadcastOn(): array
    {
        return [
            new Channel('queue'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'settings.changed';
    }

    /** @return array<string, never> */
    public function broadcastWith(): array
    {
        return [];
    }
}
