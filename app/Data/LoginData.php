<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;

final class LoginData extends Data
{
    public function __construct(
        public string $email,
        public string $password,
        public bool $remember = false,
    ) {}

    public static function authorize(): bool
    {
        return true;
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public static function prepareForPipeline(array $properties): array
    {
        $email = $properties['email'] ?? null;
        $properties['email'] = is_string($email) ? strtolower(trim($email)) : '';

        return $properties;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }
}
