<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('queue_settings', function (Blueprint $table) {
            $table->id();
            $table->string('default_prefix', 4)->nullable();
            $table->timestamps();
        });

        DB::table('queue_settings')->insert([
            'id' => 1,
            'default_prefix' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_settings');
    }
};
