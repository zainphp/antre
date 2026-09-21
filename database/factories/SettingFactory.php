<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Setting>
 */
class SettingFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => null,
            'number_digits' => 3,
            'footer_links' => null,
        ];
    }
}
