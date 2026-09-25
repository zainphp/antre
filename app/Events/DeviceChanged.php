<?php

declare(strict_types=1);

namespace App\Events;

use App\Data\Frontend\DeviceData;
use App\Models\Device;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeviceChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Device $device) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin.devices'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'device.changed';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['device' => DeviceData::fromModel($this->device)->toArray()];
    }
}
