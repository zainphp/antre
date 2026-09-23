<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithBroadcasting;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class IntegrationTested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithBroadcasting, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $testId,
        public readonly string $connection,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin.integrations'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'integration.tested';
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return [
            'test_id' => $this->testId,
            'connection' => $this->connection,
            'sent_at' => now()->toIso8601String(),
        ];
    }
}
