<?php

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
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->foreign('counter_id')->references('id')->on('counters')->nullOnDelete();
        });

        Schema::table('queue_sessions', function (Blueprint $table) {
            $table->foreign('current_entry_id')->references('id')->on('queue_entries')->nullOnDelete();
            $table->foreign('current_counter_id')->references('id')->on('counters')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_sessions', function (Blueprint $table) {
            $table->dropForeign(['current_entry_id']);
            $table->dropForeign(['current_counter_id']);
        });

        Schema::table('queue_entries', function (Blueprint $table) {
            $table->dropForeign(['counter_id']);
        });
    }
};
