<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Models\AuditEvent;
use App\Models\Device;
use App\Models\User;
use App\Services\DeviceRegistry;
use App\Services\PairingSession;
use Inertia\Testing\AssertableInertia as Assert;

function deviceCookie(Device $device, string $credential): string
{
    return $device->getKey().'.'.$credential;
}

test('pairing is closed by default', function () {
    User::factory()->administrator()->create();

    $this->get('/pair')->assertForbidden();

    expect(Device::query()->count())->toBe(0);
});

test('only an administrator can open pairing', function () {
    $admin = User::factory()->administrator()->create();
    $operator = User::factory()->create();

    $this->actingAs($operator)
        ->post(route('admin.devices.pairing-session'))
        ->assertForbidden();

    $this->actingAs($operator)
        ->post(route('admin.devices.pairing-session.close'))
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('admin.devices.pairing-session'))
        ->assertRedirect();

    expect(app(PairingSession::class)->isOpen())->toBeTrue();
});

test('an administrator can close pairing before it expires', function () {
    $admin = User::factory()->administrator()->create();

    $this->actingAs($admin)
        ->post(route('admin.devices.pairing-session'))
        ->assertRedirect();

    expect(app(PairingSession::class)->isOpen())->toBeTrue();

    $this->actingAs($admin)
        ->post(route('admin.devices.pairing-session.close'))
        ->assertRedirect();

    expect(app(PairingSession::class)->isOpen())->toBeFalse();
    $this->get('/pair')->assertForbidden();
});

test('an administrator pairing session closes after sixty seconds', function () {
    User::factory()->administrator()->create();
    app(PairingSession::class)->open();

    expect(app(PairingSession::class)->isOpen())->toBeTrue();

    $this->travel(61)->seconds();

    expect(app(PairingSession::class)->isOpen())->toBeFalse();
    $this->get('/pair')->assertForbidden();
});

test('a new device gets a persistent pairing identity during an open session', function () {
    User::factory()->administrator()->create();
    app(PairingSession::class)->open();

    $response = $this->get('/pair');

    $response->assertOk();
    $label = $response->inertiaProps('device.label');

    expect(Device::query()->count())->toBe(1)
        ->and($response->headers->getCookies())->not->toBeEmpty()
        ->and($label)->toMatch('/\A[0-9A-F]{4}\z/')
        ->and(Device::query()->firstOrFail()->auditEvents()->exists())->toBeFalse();
});

test('a device role is required before dedicated display access', function () {
    User::factory()->administrator()->create();
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
    User::factory()->administrator()->create();
    $credential = 'display-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::Display->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))->get(route('queue-terminal'));

    $response->assertForbidden();

    $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))
        ->get(route('queue-terminal.settings'))
        ->assertForbidden();
});

test('operator access requires a registered operator terminal', function () {
    User::factory()->administrator()->create();
    $credential = 'operator-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::OperatorTerminal->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, deviceCookie($device, $credential))
        ->get(route('operator-terminal'));

    $response->assertInertia(
        fn (Assert $page): Assert => $page
            ->component('operator-terminal')
            ->where('canOpenQueueTerminal', false)
            ->where('canOpenDisplay', false),
    );

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
    User::factory()->administrator()->create();
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

    expect(Device::withTrashed()->find($registered->id))->not->toBeNull();

    $revoked = Device::factory()->create([
        'status' => DeviceStatus::Revoked,
        'roles' => [],
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.devices.destroy', $revoked))
        ->assertRedirect();

    expect(Device::withTrashed()->find($revoked->id))->toBeNull();
});

test('a device with history is soft deleted', function () {
    $admin = User::factory()->administrator()->create();
    $device = Device::factory()->create([
        'status' => DeviceStatus::Revoked,
        'roles' => [],
    ]);
    AuditEvent::factory()->create(['device_id' => $device->id]);

    $this->actingAs($admin)
        ->delete(route('admin.devices.destroy', $device))
        ->assertRedirect();

    expect(Device::find($device->id))->toBeNull()
        ->and(Device::withTrashed()->find($device->id)?->deleted_at)->not->toBeNull();
});

test('a device with multiple roles can access each assigned experience', function () {
    User::factory()->administrator()->create();
    $credential = 'operator-display-secret';
    $device = Device::factory()->roles(
        DeviceRole::OperatorTerminal,
        DeviceRole::Display,
        DeviceRole::QueueTerminal,
    )->create([
        'credential_hash' => hash('sha256', $credential),
    ]);
    $cookie = deviceCookie($device, $credential);

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('operator-terminal'))
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('operator-terminal')
                ->where('canOpenQueueTerminal', true)
                ->where('canOpenDisplay', true),
        );

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('queue-terminal'))
        ->assertOk();

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('queue-terminal.settings'))
        ->assertOk();

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('display'))
        ->assertOk();

    $homeResponse = $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('home'));

    if (app()->environment('production')) {
        $homeResponse->assertRedirect(route('operator-terminal'));
    } else {
        $homeResponse->assertOk();
    }
});
