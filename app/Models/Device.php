<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use Database\Factories\DeviceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property DeviceRole|null $role
 * @property DeviceStatus $status
 * @property string $credential_hash
 * @property Carbon|null $registered_at
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $revoked_at
 */
#[Fillable(['name', 'role', 'status', 'credential_hash', 'registered_at', 'last_seen_at', 'revoked_at'])]
#[Hidden(['credential_hash'])]
class Device extends Model
{
    /** @use HasFactory<DeviceFactory> */
    use HasFactory, HasUuids;

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['id'];
    }

    protected function casts(): array
    {
        return [
            'role' => DeviceRole::class,
            'status' => DeviceStatus::class,
            'registered_at' => 'immutable_datetime',
            'last_seen_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
        ];
    }

    /** @return HasMany<AuditEvent, $this> */
    public function auditEvents(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }

    /** @return HasMany<QueueEntry, $this> */
    public function queueEntries(): HasMany
    {
        return $this->hasMany(QueueEntry::class);
    }

    public function isAssigned(): bool
    {
        return $this->status === DeviceStatus::Registered && $this->role !== null;
    }
}
