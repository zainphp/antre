<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $brand_name
 * @property string $session_name
 * @property string|null $default_prefix
 * @property int $number_digits
 * @property int $number_counters
 * @property list<mixed>|null $footer_links
 */
#[Fillable(['brand_name', 'session_name', 'default_prefix', 'number_digits', 'number_counters', 'footer_links'])]
class Setting extends Model
{
    /** @use HasFactory<SettingFactory> */
    use HasFactory;

    public static function current(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            [
                'brand_name' => 'ANTRE',
                'session_name' => 'Pelayanan Pelanggan',
                'default_prefix' => null,
                'number_digits' => 3,
                'number_counters' => 1,
                'footer_links' => null,
            ],
        );
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'footer_links' => 'array',
            'number_counters' => 'integer',
        ];
    }

    /** @return non-empty-list<string> */
    public function counterNames(): array
    {
        return array_map(
            static fn (int $number): string => 'Loket '.$number,
            range(1, $this->number_counters),
        );
    }

    /** @return list<array{label: string, url: string}> */
    public function footerLinks(): array
    {
        $links = $this->footer_links ?? [];
        $validLinks = [];

        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }

            $label = $link['label'] ?? null;
            $url = $link['url'] ?? null;
            if (! is_string($label) || ! is_string($url)) {
                continue;
            }

            $validLinks[] = ['label' => $label, 'url' => $url];
        }

        return $validLinks;
    }
}
