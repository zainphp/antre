<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->administrator()->create([
            'name' => 'Administrator',
            'email' => 'admin@example.com',
        ]);

        User::factory()->create([
            'name' => 'Operator',
            'email' => 'operator@example.com',
        ]);
    }
}
