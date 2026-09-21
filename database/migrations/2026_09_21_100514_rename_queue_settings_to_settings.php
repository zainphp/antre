<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('queue_settings', 'settings');

        Schema::table('settings', function (Blueprint $table): void {
            $table->string('brand_name', 80)->default('ANTRE')->after('id');
            $table->string('session_name', 120)->default('Pelayanan Pelanggan')->after('brand_name');
            $table->json('footer_links')->nullable()->after('number_digits');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table): void {
            $table->dropColumn(['brand_name', 'session_name', 'footer_links']);
        });

        Schema::rename('settings', 'queue_settings');
    }
};
