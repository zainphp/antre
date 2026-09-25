<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Models\QueueEntry;
use Spatie\LaravelData\Attributes\MapOutputName;

final class QueueHistoryEntryData extends QueueEntryData
{
    #[MapOutputName('completed_at')]
    public ?string $completedAt = null;

    #[MapOutputName('forfeit_reason')]
    public ?string $forfeitReason = null;

    public static function fromHistory(QueueEntry $entry): self
    {
        $data = parent::fromModel($entry);
        $data->completedAt = $entry->completed_at?->toISOString();
        $data->forfeitReason = $entry->forfeit_reason;

        return $data;
    }
}
