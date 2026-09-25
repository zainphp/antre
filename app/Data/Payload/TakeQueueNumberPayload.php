<?php

declare(strict_types=1);

namespace App\Data\Payload;

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rules\File;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class TakeQueueNumberPayload extends Data
{
    public function __construct(
        #[MapInputName('request_id')]
        public string $requestId,
        public ?UploadedFile $photo = null,
    ) {}

    public static function authorize(): bool
    {
        $device = request()->attributes->get('device');

        return $device instanceof Device
            && $device->isAssigned()
            && $device->hasRole(DeviceRole::QueueTerminal);
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        $photoRequirement = Setting::current()->photo_required
            ? 'required'
            : 'nullable';

        return [
            'request_id' => ['required', 'uuid'],
            'photo' => [
                $photoRequirement,
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(2048),
            ],
        ];
    }
}
