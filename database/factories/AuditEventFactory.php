<?php

namespace Database\Factories;

use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditEvent>
 */
class AuditEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'device_id' => null,
            'event_name' => 'queue.taken',
            'subject_type' => null,
            'subject_id' => null,
            'metadata' => [],
        ];
    }
}
