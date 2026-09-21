<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DeviceRole;
use App\Models\Device;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class QueueActionData extends Data
{
    public function __construct(
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

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'counter' => ['sometimes', 'nullable', 'string', 'max:40'],
            'entry_id' => ['sometimes', 'nullable', 'uuid'],
        ];
    }
}
