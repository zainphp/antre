<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class UpdateQueueSettingsData extends Data
{
    /**
     * @param  list<array{label: string, url: string}>  $footerLinks
     */
    public function __construct(
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
        #[MapInputName('photo_required')]
        public bool $photoRequired = false,
        #[MapInputName('footer_links')]
        public array $footerLinks = [],
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
        foreach (['brand_name', 'session_name'] as $key) {
            $value = $properties[$key] ?? null;
            $properties[$key] = is_string($value) ? trim($value) : $value;
        }

        $prefix = $properties['default_prefix'] ?? null;
        $prefix = is_string($prefix) ? strtoupper(trim($prefix)) : null;
        $properties['default_prefix'] = $prefix === '' ? null : $prefix;

        return $properties;
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
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
            'photo_required' => ['required', 'boolean'],
            'footer_links' => ['array', 'max:5'],
            'footer_links.*.label' => ['required', 'string', 'max:40'],
            'footer_links.*.url' => [
                'required',
                'string',
                'url',
                'starts_with:http://,https://',
                'max:2048',
            ],
        ];
    }
}
