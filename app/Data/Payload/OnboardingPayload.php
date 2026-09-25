<?php

declare(strict_types=1);

namespace App\Data\Payload;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class OnboardingPayload extends Data
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
        #[MapInputName('password_confirmation')]
        public string $passwordConfirmation,
        #[MapInputName('brand_name')]
        public string $brandName = 'ANTRE',
        #[MapInputName('session_name')]
        public string $sessionName = 'Pelayanan Pelanggan',
        #[MapInputName('default_prefix')]
        public ?string $defaultPrefix = null,
        #[MapInputName('number_digits')]
        public int $numberDigits = 3,
        #[MapInputName('number_counters')]
        public int $numberCounters = 1,
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
        foreach (['name', 'brand_name', 'session_name'] as $key) {
            $value = $properties[$key] ?? null;
            $properties[$key] = is_string($value) ? trim($value) : $value;
        }

        $email = $properties['email'] ?? null;
        $properties['email'] = is_string($email) ? strtolower(trim($email)) : '';

        $prefix = $properties['default_prefix'] ?? null;
        $prefix = is_string($prefix) ? strtoupper(trim($prefix)) : null;
        $properties['default_prefix'] = $prefix === '' ? null : $prefix;

        return $properties;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
            'brand_name' => ['required', 'string', 'max:80'],
            'session_name' => ['required', 'string', 'max:120'],
            'default_prefix' => [
                'nullable',
                'string',
                'max:4',
                'regex:/^[A-Z0-9]+$/',
            ],
            'number_digits' => ['required', 'integer', 'min:1', 'max:6'],
            'number_counters' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }
}
