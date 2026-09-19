<?php

namespace App\Models;

use App\Enums\QueueStatus;
use Database\Factories\QueueEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $queue_session_id
 * @property int $sequence
 * @property string $number
 * @property QueueStatus $status
 * @property string|null $photo_path
 * @property string|null $request_id
 * @property string|null $counter_id
 * @property string|null $device_id
 * @property Carbon|null $called_at
 * @property Carbon|null $completed_at
 */
#[Fillable(['queue_session_id', 'sequence', 'number', 'status', 'photo_path', 'request_id', 'counter_id', 'device_id', 'called_at', 'completed_at'])]
class QueueEntry extends Model
{
    /** @use HasFactory<QueueEntryFactory> */
    use HasFactory, HasUuids;

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['id'];
    }

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'status' => QueueStatus::class,
            'called_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<QueueSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(QueueSession::class, 'queue_session_id');
    }

    /** @return BelongsTo<Counter, $this> */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(Counter::class);
    }

    /** @return BelongsTo<Device, $this> */
    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
