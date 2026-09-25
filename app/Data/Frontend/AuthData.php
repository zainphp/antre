<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use App\Models\User;
use Spatie\LaravelData\Data;

final class AuthData extends Data
{
    public function __construct(public ?AuthUserData $user) {}

    public static function fromUser(?User $user): self
    {
        return new self($user === null ? null : AuthUserData::fromUser($user));
    }
}
