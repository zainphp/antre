<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\QueueSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QueueSetting>
 */
class QueueSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'default_prefix' => null,
            'number_digits' => 3,
        ];
    }
}
