<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CounterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $name
 * @property bool $active
 */
#[Fillable(['name', 'active'])]
class Counter extends Model
{
    /** @use HasFactory<CounterFactory> */
    use HasFactory, HasUuids;

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['id'];
    }

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    /** @return HasMany<QueueEntry, $this> */
    public function queueEntries(): HasMany
    {
        return $this->hasMany(QueueEntry::class);
    }
}
