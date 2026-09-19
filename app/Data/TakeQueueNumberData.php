<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DeviceRole;
use App\Models\Device;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rules\File;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class TakeQueueNumberData extends Data
{
    public function __construct(
        #[MapInputName('request_id')]
        public string $requestId,
        public ?UploadedFile $photo = null,
    ) {}

    public static function authorize(): bool
    {
        $device = request()->attributes->get('device');

        return $device instanceof Device && $device->role === DeviceRole::QueueTerminal;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'request_id' => ['required', 'uuid'],
            'photo' => [
                'nullable',
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(2048),
            ],
        ];
    }
}
