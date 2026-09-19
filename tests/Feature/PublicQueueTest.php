<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Services\DeviceRegistry;
use App\Services\QueueService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

test('the public home page and queue API do not require login', function () {
    $this->get('/')->assertOk();

    $response = $this->getJson('/api/queue/state');

    $response->assertOk()->assertJsonStructure(['data' => ['session', 'current', 'waiting', 'stats']]);
});

test('public queue state excludes private entry data', function () {
    Event::fake();
    $device = Device::factory()->roles(DeviceRole::QueueTerminal)->create();
    app(QueueService::class)->take(null, (string) Str::uuid(), $device);
    QueueEntry::query()->firstOrFail()->update(['photo_path' => 'queue-photos/private.jpg']);

    $response = $this->getJson('/api/queue/state');

    $response->assertOk()->assertJsonMissingPath('data.waiting.0.photo_path')->assertJsonMissingPath('data.waiting.0.device_id');
});

test('an unregistered device identity can view public content', function () {
    $device = Device::factory()->unregistered()->create(['credential_hash' => hash('sha256', 'pending-secret')]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, $device->id.'.pending-secret')->get('/');

    $response->assertOk();
});
