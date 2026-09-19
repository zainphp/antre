<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class UpdateQueueSettingsData extends Data
{
    public function __construct(
        #[MapInputName('default_prefix')]
        public ?string $defaultPrefix = null,
        #[MapInputName('number_digits')]
        public int $numberDigits = 3,
    ) {}

    public static function authorize(#[CurrentUser] ?User $user): bool
    {
        return $user instanceof User && $user->isAdministrator();
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public static function prepareForPipeline(array $properties): array
    {
        $prefix = $properties['default_prefix'] ?? null;
        $prefix = is_string($prefix) ? strtoupper(trim($prefix)) : null;
        $properties['default_prefix'] = $prefix === '' ? null : $prefix;

        return $properties;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'default_prefix' => [
                'nullable',
                'string',
                'max:4',
                'regex:/^[A-Z0-9]+$/',
            ],
            'number_digits' => ['required', 'integer', 'min:1', 'max:6'],
        ];
    }
}
