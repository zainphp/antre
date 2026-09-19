<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table): void {
            $table->json('roles')->nullable()->after('name');
        });

        foreach (DB::table('devices')->whereNotNull('role')->get(['id', 'role']) as $device) {
            if (is_string($device->role)) {
                DB::table('devices')
                    ->where('id', $device->id)
                    ->update(['roles' => json_encode([$device->role], JSON_THROW_ON_ERROR)]);
            }
        }

        Schema::table('devices', function (Blueprint $table): void {
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table): void {
            $table->string('role')->nullable()->after('name');
        });

        foreach (DB::table('devices')->get(['id', 'roles']) as $device) {
            $roles = is_string($device->roles) ? json_decode($device->roles, true) : [];
            $role = is_array($roles) && is_string($roles[0] ?? null) ? $roles[0] : null;

            DB::table('devices')
                ->where('id', $device->id)
                ->update(['role' => $role]);
        }

        Schema::table('devices', function (Blueprint $table): void {
            $table->dropColumn('roles');
        });
    }
};
