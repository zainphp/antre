<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('queue_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('number_digits')->default(3);
        });

        Schema::table('queue_sessions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('number_digits')->default(3);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_sessions', function (Blueprint $table): void {
            $table->dropColumn('number_digits');
        });

        Schema::table('queue_settings', function (Blueprint $table): void {
            $table->dropColumn('number_digits');
        });
    }
};
