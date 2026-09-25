<?php

declare(strict_types=1);

namespace App\Data\Payload;

use App\Enums\DeviceRole;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

final class AssignDevicePayload extends Data
{
    public function __construct(
        public string $name,
        /** @var list<DeviceRole|string> */
        public array $roles,
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
            'roles' => ['required', 'array', 'min:1', 'max:3'],
            'roles.*' => ['required', 'distinct', Rule::enum(DeviceRole::class)],
        ];
    }
}
