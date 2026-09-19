<?php

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Models\Device;
use App\Models\User;
use App\Services\DeviceRegistry;

function deviceCookie(Device $device, string $credential): string
{
    return $device->getKey().'.'.$credential;
}

test('a new device gets a persistent pairing identity', function () {
    $response = $this->get('/pair');

    $response->assertOk();
    expect(Device::query()->count())->toBe(1)
        ->and($response->headers->getCookies())->not->toBeEmpty();
});

test('a device role is required before dedicated display access', function () {
    $credential = 'display-secret';
    $device = Device::factory()->create([
        'role' => DeviceRole::Display,
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))->get('/display');

    $response->assertOk();
});

test('an assigned display cannot use the queue terminal endpoint', function () {
    $credential = 'display-secret';
    $device = Device::factory()->create([
        'role' => DeviceRole::Display,
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))->get('/take-number');

    $response->assertForbidden();
});

test('operator access requires both an operator user and an operator terminal', function () {
    $credential = 'operator-secret';
    $device = Device::factory()->create([
        'role' => DeviceRole::OperatorTerminal,
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->actingAs(User::factory()->create())
        ->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))
        ->get('/operator');

    $response->assertOk();

    $display = Device::factory()->create([
        'role' => DeviceRole::Display,
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', 'display-secret'),
    ]);

    $this->actingAs(User::factory()->create())
        ->withCookie(DeviceRegistry::COOKIE, deviceCookie($display, 'display-secret'))
        ->get('/operator')
        ->assertForbidden();
});

test('only administrators can assign devices', function () {
    $device = Device::factory()->unregistered()->create();
    $operator = User::factory()->create();

    $response = $this->actingAs($operator)->patch(route('admin.devices.assign', $device), [
        'name' => 'Layar depan',
        'role' => DeviceRole::Display->value,
    ]);

    $response->assertForbidden();
    expect($device->fresh()->status)->toBe(DeviceStatus::Unregistered);
});

test('revoking a device retains its identity and removes its role', function () {
    $device = Device::factory()->create();
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.devices.revoke', $device));

    $response->assertRedirect();
    expect($device->fresh()->status)->toBe(DeviceStatus::Revoked)
        ->and($device->fresh()->role)->toBeNull()
        ->and(Device::query()->whereKey($device->id)->exists())->toBeTrue();
});
