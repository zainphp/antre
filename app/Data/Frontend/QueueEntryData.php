<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Enums\QueueStatus;
use App\Models\QueueEntry;
use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class QueueEntryData extends Data
{
    public function __construct(
        public string $id,
        public string $number,
        public QueueStatus $status,
        public ?string $counter,
        #[MapOutputName('created_at')]
        public ?string $createdAt,
        #[MapOutputName('called_at')]
        public ?string $calledAt,
        #[MapOutputName('photo_url')]
        public string|Optional $photoUrl,
    ) {}

    public static function fromModel(QueueEntry $entry, bool $includePhoto = false): static
    {
        $photoUrl = $includePhoto && $entry->photo_path !== null
            ? route('operator.queue.photo', ['entry' => $entry->getKey()], false)
            : Optional::create();

        return new static(
            id: $entry->id,
            number: $entry->number,
            status: $entry->status,
            counter: $entry->counter?->name,
            createdAt: $entry->created_at?->toISOString(),
            calledAt: $entry->called_at?->toISOString(),
            photoUrl: $photoUrl,
        );
    }
}
