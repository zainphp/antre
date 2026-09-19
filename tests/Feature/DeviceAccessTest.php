<?php

declare(strict_types=1);

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
        'roles' => [DeviceRole::Display->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))->get('/display');

    $response->assertOk();
});

test('an assigned display cannot use the queue terminal endpoint', function () {
    $credential = 'display-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::Display->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))->get(route('queue-terminal'));

    $response->assertForbidden();
});

test('operator access requires a registered operator terminal', function () {
    $credential = 'operator-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::OperatorTerminal->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))
        ->get(route('operator-terminal'));

    $response->assertOk();

    $display = Device::factory()->create([
        'roles' => [DeviceRole::Display->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', 'display-secret'),
    ]);

    $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($display, 'display-secret'))
        ->get(route('operator-terminal'))
        ->assertForbidden();
});

test('only administrators can assign devices', function () {
    $device = Device::factory()->unregistered()->create();
    $operator = User::factory()->create();

    $response = $this->actingAs($operator)->patch(route('admin.devices.assign', $device), [
        'name' => 'Layar depan',
        'roles' => [DeviceRole::Display->value],
    ]);

    $response->assertForbidden();
    expect($device->fresh()->status)->toBe(DeviceStatus::Unregistered);
});

test('device assignment requires at least one role', function () {
    $device = Device::factory()->unregistered()->create();
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.devices.assign', $device), [
        'name' => 'Perangkat tanpa peran',
        'roles' => [],
    ]);

    $response->assertSessionHasErrors('roles');
    expect($device->fresh()->status)->toBe(DeviceStatus::Unregistered);
});

test('revoking a device retains its identity and removes its roles', function () {
    $device = Device::factory()->create();
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.devices.revoke', $device));

    $response->assertRedirect();
    expect($device->fresh()->status)->toBe(DeviceStatus::Revoked)
        ->and($device->fresh()->roles)->toBe([])
        ->and(Device::query()->whereKey($device->id)->exists())->toBeTrue();
});

test('only inactive devices can be deleted from the active list', function () {
    $admin = User::factory()->administrator()->create();
    $registered = Device::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.devices.destroy', $registered))
        ->assertSessionHasErrors('device');

    expect(Device::withTrashed()->find($registered->id)?->deleted_at)->toBeNull();

    $revoked = Device::factory()->create([
        'status' => DeviceStatus::Revoked,
        'roles' => [],
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.devices.destroy', $revoked))
        ->assertRedirect();

    expect(Device::query()->find($revoked->id))->toBeNull()
        ->and(Device::withTrashed()->find($revoked->id)?->deleted_at)->not->toBeNull();
});

test('a device with multiple roles can access each assigned experience', function () {
    $credential = 'operator-display-secret';
    $device = Device::factory()->roles(
        DeviceRole::OperatorTerminal,
        DeviceRole::Display,
    )->create([
        'credential_hash' => hash('sha256', $credential),
    ]);
    $cookie = deviceCookie($device, $credential);

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('operator-terminal'))
        ->assertOk();

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('display'))
        ->assertOk();

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('home'))
        ->assertRedirect(route('operator-terminal'));
});
