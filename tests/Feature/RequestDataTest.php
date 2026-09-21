<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Models\User;
use App\Services\DeviceRegistry;
use App\Services\QueueService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

test('login data normalizes credentials before authentication', function () {
    $user = User::factory()->create([
        'email' => 'operator@example.com',
        'password' => 'secret',
        'role' => UserRole::Administrator,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => ' OPERATOR@EXAMPLE.COM ',
        'password' => 'secret',
        'remember' => true,
    ]);

    $response->assertRedirect(route('home'));
    expect(auth()->id())->toBe($user->id);
});

test('assign device data authorizes and persists a device assignment', function () {
    $device = Device::factory()->unregistered()->create();

    $response = $this->actingAs(User::factory()->administrator()->create())
        ->patch(route('admin.devices.assign', $device), [
            'name' => 'Layar depan',
            'roles' => [
                DeviceRole::Display->value,
                DeviceRole::OperatorTerminal->value,
            ],
        ]);

    $response->assertRedirect();
    expect($device->fresh())
        ->status->toBe(DeviceStatus::Registered)
        ->hasRole(DeviceRole::Display)->toBeTrue()
        ->hasRole(DeviceRole::OperatorTerminal)->toBeTrue()
        ->name->toBe('Layar depan');
});

test('take queue number data validates an authenticated terminal request', function () {
    Storage::fake('local');
    $credential = 'queue-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::QueueTerminal->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);
    $photo = UploadedFile::fake()->image('queue-photo.jpg');

    $response = $this->withCookie(
        DeviceRegistry::COOKIE,
        $device->id.'.'.$credential,
    )->post(route('queue.take'), [
        'request_id' => (string) Str::uuid(),
        'photo' => $photo,
    ]);

    $response->assertCreated()->assertJsonPath('data.number', '001');
    $entry = QueueEntry::query()->firstOrFail();
    expect($entry->photo_path)->not->toBeNull();

    if ($entry->photo_path === null) {
        return;
    }

    Storage::disk('local')->assertExists($entry->photo_path);
});

test('queue action data authorizes an operator terminal request', function () {
    $credential = 'operator-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::OperatorTerminal->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);
    app(QueueService::class)->take(null, (string) Str::uuid(), $device);

    $response = $this->withCookie(
        DeviceRegistry::COOKIE,
        $device->id.'.'.$credential,
    )->post(route('queue.call-next'), [
        'counter' => 'Loket 1',
    ]);

    $response->assertRedirect();
    expect(QueueEntry::query()->firstOrFail())
        ->status->toBe(QueueStatus::Called)
        ->counter->name->toBe('Loket 1');
});

test('operator terminals can recall a selected unfinished number', function () {
    $credential = 'operator-recall-secret';
    $device = Device::factory()->create([
        'roles' => [DeviceRole::OperatorTerminal->value],
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);
    $queues = app(QueueService::class);
    $entry = $queues->take(null, (string) Str::uuid(), $device);
    $cookie = $device->id.'.'.$credential;

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->post(route('queue.call-next'), ['counter' => 'Loket 1'])
        ->assertRedirect();
    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->post(route('queue.skip'))
        ->assertRedirect();

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->post(route('queue.recall'), [
            'counter' => 'Loket 1',
            'entry_id' => $entry->id,
        ])
        ->assertRedirect();

    expect(QueueEntry::query()->firstOrFail())
        ->status->toBe(QueueStatus::Called)
        ->counter->name->toBe('Loket 1');
});

test('operator accounts cannot authenticate through the administrator login', function () {
    User::factory()->create([
        'email' => 'operator@example.com',
        'password' => 'secret',
    ]);

    $response = $this->post(route('login.store'), [
        'email' => 'operator@example.com',
        'password' => 'secret',
    ]);

    $response->assertSessionHasErrors('email');
    expect(auth()->check())->toBeFalse();
});
