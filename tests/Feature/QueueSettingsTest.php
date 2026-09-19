<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\QueueSetting;
use App\Models\User;
use App\Services\QueueService;
use Illuminate\Support\Str;

test('only administrators can view and update queue settings', function () {
    $settings = route('admin.settings');

    $this->get($settings)->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get($settings)->assertForbidden();

    $admin = User::factory()->administrator()->create();
    $this->actingAs($admin)->get($settings)->assertOk();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => 'B',
            'number_digits' => 4,
        ])
        ->assertRedirect();

    expect(QueueSetting::current()->default_prefix)->toBe('B')
        ->and(QueueSetting::current()->number_digits)->toBe(4);
});

test('a nullable default prefix formats new queue numbers without a separator', function () {
    $admin = User::factory()->administrator()->create();
    $device = Device::factory()->role(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('001');
    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => 'B',
            'number_digits' => 4,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('B0001');

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => '',
            'number_digits' => 2,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect(QueueSetting::current()->default_prefix)->toBeNull()
        ->and($queues->take(null, (string) Str::uuid())->number)->toBe('01');
});

test('a default prefix rejects separators and unsupported characters', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'default_prefix' => 'A-',
        'number_digits' => 3,
    ]);

    $response->assertSessionHasErrors('default_prefix');
    expect(QueueSetting::current()->default_prefix)->toBeNull();
});

test('number digits must be between one and six', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'default_prefix' => null,
        'number_digits' => 7,
    ]);

    $response->assertSessionHasErrors('number_digits');
    expect(QueueSetting::current()->number_digits)->toBe(3);
});
