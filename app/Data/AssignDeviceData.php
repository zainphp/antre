<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DeviceRole;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

final class AssignDeviceData extends Data
{
    public function __construct(
        public string $name,
        public DeviceRole $role,
    ) {}

    public static function authorize(#[CurrentUser] ?User $user): bool
    {
        return $user instanceof User && $user->isAdministrator();
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', Rule::enum(DeviceRole::class)],
        ];
    }
}
