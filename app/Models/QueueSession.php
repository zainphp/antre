<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QueueSessionStatus;
use Database\Factories\QueueSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property Carbon $business_date
 * @property string|null $active_key
 * @property string|null $prefix
 * @property int $number_digits
 * @property string $service_name
 * @property int $next_sequence
 * @property QueueSessionStatus $status
 * @property string|null $current_entry_id
 * @property string|null $current_counter_id
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 */
#[Fillable(['business_date', 'active_key', 'prefix', 'number_digits', 'service_name', 'next_sequence', 'status', 'current_entry_id', 'current_counter_id', 'started_at', 'ended_at'])]
class QueueSession extends Model
{
    /** @use HasFactory<QueueSessionFactory> */
    use HasFactory, HasUuids;

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['id'];
    }

    protected function casts(): array
    {
        return [
            'business_date' => 'date:Y-m-d',
            'number_digits' => 'integer',
            'next_sequence' => 'integer',
            'status' => QueueSessionStatus::class,
            'started_at' => 'immutable_datetime',
            'ended_at' => 'immutable_datetime',
        ];
    }

    /** @return HasMany<QueueEntry, $this> */
    public function entries(): HasMany
    {
        return $this->hasMany(QueueEntry::class);
    }

    /** @return BelongsTo<QueueEntry, $this> */
    public function currentEntry(): BelongsTo
    {
        return $this->belongsTo(QueueEntry::class, 'current_entry_id');
    }

    /** @return BelongsTo<Counter, $this> */
    public function currentCounter(): BelongsTo
    {
        return $this->belongsTo(Counter::class, 'current_counter_id');
    }
}
