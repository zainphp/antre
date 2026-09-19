<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Enums\DeviceStatus;
use App\Enums\QueueStatus;
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
            'role' => DeviceRole::Display->value,
        ]);

    $response->assertRedirect();
    expect($device->fresh())
        ->status->toBe(DeviceStatus::Registered)
        ->role->toBe(DeviceRole::Display)
        ->name->toBe('Layar depan');
});

test('take queue number data validates an authenticated terminal request', function () {
    Storage::fake('local');
    $credential = 'queue-secret';
    $device = Device::factory()->create([
        'role' => DeviceRole::QueueTerminal,
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

    $response->assertCreated()->assertJsonPath('data.number', 'A-001');
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
        'role' => DeviceRole::OperatorTerminal,
        'status' => DeviceStatus::Registered,
        'credential_hash' => hash('sha256', $credential),
    ]);
    app(QueueService::class)->take(null, (string) Str::uuid(), $device);

    $response = $this->actingAs(User::factory()->create())
        ->withCookie(
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
