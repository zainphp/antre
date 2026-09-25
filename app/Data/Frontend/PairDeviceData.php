<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Enums\DeviceStatus;
use App\Models\Device;
use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;

final class PairDeviceData extends Data
{
    /**
     * @param  list<string>  $roles
     * @param  list<string>  $roleLabels
     */
    public function __construct(
        public string $id,
        public string $label,
        #[LiteralTypeScriptType('App.Enums.DeviceRole[]')]
        public array $roles,
        #[MapOutputName('role_labels')]
        public array $roleLabels,
        public DeviceStatus $status,
    ) {}

    public static function fromModel(Device $device): self
    {
        $data = DeviceData::fromModel($device);

        return new self(
            id: $data->id,
            label: $data->label,
            roles: $data->roles,
            roleLabels: $data->roleLabels,
            status: $data->status,
        );
    }
}
