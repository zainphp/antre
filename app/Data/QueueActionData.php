<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;
use Spatie\LaravelData\Data;

final class QueueActionData extends Data
{
    public function __construct(
        public ?string $counter = null,
    ) {}

    public static function authorize(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->canOperateQueue();
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'counter' => ['sometimes', 'nullable', 'string', 'max:40'],
        ];
    }
}
