<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class AuditLogger
{
    /** @param array<string, mixed> $metadata */
    public function record(
        string $eventName,
        ?User $user = null,
        ?Device $device = null,
        ?Model $subject = null,
        array $metadata = [],
    ): AuditEvent {
        return AuditEvent::create([
            'user_id' => $user?->getKey(),
            'device_id' => $device?->getKey(),
            'event_name' => $eventName,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata,
        ]);
    }
}
