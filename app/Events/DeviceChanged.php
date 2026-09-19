<?php

namespace App\Events;

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
        return [
            'device' => [
                'id' => $this->device->id,
                'label' => 'KBS-'.strtoupper(substr(str_replace('-', '', $this->device->id), 0, 4)),
                'name' => $this->device->name,
                'role' => $this->device->role?->value,
                'role_label' => $this->device->role?->label(),
                'status' => $this->device->status->value,
                'registered_at' => $this->device->registered_at?->toISOString(),
                'last_seen_at' => $this->device->last_seen_at?->toISOString(),
                'revoked_at' => $this->device->revoked_at?->toISOString(),
            ],
        ];
    }
}
