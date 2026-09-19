<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AuditEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property int|null $user_id
 * @property string|null $device_id
 * @property string $event_name
 * @property string|null $subject_type
 * @property string|null $subject_id
 * @property array<string, mixed>|null $metadata
 */
#[Fillable(['user_id', 'device_id', 'event_name', 'subject_type', 'subject_id', 'metadata'])]
class AuditEvent extends Model
{
    /** @use HasFactory<AuditEventFactory> */
    use HasFactory, HasUuids;

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['id'];
    }

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Device, $this> */
    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
