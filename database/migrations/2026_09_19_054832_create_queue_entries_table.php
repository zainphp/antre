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
        Schema::create('queue_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('queue_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('number', 16);
            $table->string('status')->default('WAITING');
            $table->string('photo_path')->nullable();
            $table->uuid('request_id')->nullable();
            $table->uuid('counter_id')->nullable();
            $table->foreignUuid('device_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['queue_session_id', 'sequence']);
            $table->unique(['queue_session_id', 'number']);
            $table->unique(['queue_session_id', 'request_id']);
            $table->index(['queue_session_id', 'status', 'sequence']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_entries');
    }
};
