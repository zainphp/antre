<?php

namespace Database\Factories;

use App\Enums\QueueSessionStatus;
use App\Models\QueueSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QueueSession>
 */
class QueueSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'business_date' => today()->toDateString(),
            'active_key' => null,
            'prefix' => 'A',
            'service_name' => 'Pelayanan TBS',
            'next_sequence' => 1,
            'status' => QueueSessionStatus::Running,
            'current_entry_id' => null,
            'current_counter_id' => null,
            'started_at' => now(),
            'ended_at' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(function (array $attributes): array {
            $businessDate = $attributes['business_date'] ?? null;
            if (! is_string($businessDate)) {
                throw new \LogicException('Business date must be a string.');
            }

            return ['active_key' => $businessDate];
        });
    }
}
