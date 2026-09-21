<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_sessions', function (Blueprint $table): void {
            $table->dropColumn('service_name');
        });
    }

    public function down(): void
    {
        Schema::table('queue_sessions', function (Blueprint $table): void {
            $table->string('service_name')->default('Pelayanan Pelanggan');
        });
    }
};
