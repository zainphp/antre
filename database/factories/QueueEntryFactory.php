<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\QueueStatus;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<QueueEntry>
 */
class QueueEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'queue_session_id' => QueueSession::factory(),
            'sequence' => fake()->unique()->numberBetween(1, 999),
            'number' => function (array $attributes): string {
                $sequence = $attributes['sequence'] ?? null;
                if (is_int($sequence)) {
                    $sequence = (string) $sequence;
                }

                if (! is_string($sequence)) {
                    throw new \LogicException('Queue sequence must be a string or integer.');
                }

                return str_pad($sequence, 3, '0', STR_PAD_LEFT);
            },
            'status' => QueueStatus::Waiting,
            'photo_path' => null,
            'forfeit_reason' => null,
            'request_id' => Str::uuid()->toString(),
            'counter_id' => null,
            'device_id' => null,
            'called_at' => null,
            'completed_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
