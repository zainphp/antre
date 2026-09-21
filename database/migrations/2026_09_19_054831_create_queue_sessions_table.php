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
        Schema::create('queue_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('business_date');
            $table->string('active_key')->nullable()->unique();
            $table->string('prefix', 4)->nullable();
            $table->string('service_name')->default('Pelayanan Pelanggan');
            $table->unsignedInteger('next_sequence')->default(1);
            $table->string('status')->default('RUNNING');
            $table->uuid('current_entry_id')->nullable();
            $table->uuid('current_counter_id')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['business_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_sessions');
    }
};
