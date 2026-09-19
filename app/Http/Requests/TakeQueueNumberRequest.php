<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\DeviceRole;
use App\Models\Device;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

final class TakeQueueNumberRequest extends FormRequest
{
    public function authorize(): bool
    {
        $device = $this->attributes->get('device');

        return $device instanceof Device && $device->role === DeviceRole::QueueTerminal;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
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
