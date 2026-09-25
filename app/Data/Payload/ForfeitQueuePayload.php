<?php

declare(strict_types=1);

namespace App\Data\Payload;

use App\Enums\DeviceRole;
use App\Models\Device;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class ForfeitQueuePayload extends Data
{
    public function __construct(
        public string $reason,
        public ?string $counter = null,
        #[MapInputName('entry_id')]
        public ?string $entryId = null,
    ) {}

    public static function authorize(): bool
    {
        $device = request()->attributes->get('device');

        return $device instanceof Device
            && $device->isAssigned()
            && $device->hasRole(DeviceRole::OperatorTerminal);
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public static function prepareForPipeline(array $properties): array
    {
        $reason = $properties['reason'] ?? null;
        $properties['reason'] = is_string($reason) ? trim($reason) : $reason;

        return $properties;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'counter' => ['sometimes', 'nullable', 'string', 'max:40'],
            'entry_id' => ['sometimes', 'nullable', 'uuid'],
        ];
    }
}
