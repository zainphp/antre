<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Enums\UserRole;
use App\Models\User;
use Spatie\LaravelData\Data;

final class AuthUserData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public UserRole $role,
    ) {}

    public static function fromUser(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
            role: $user->role,
        );
    }
}
