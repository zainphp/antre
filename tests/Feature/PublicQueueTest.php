<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Events\QueueChanged;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Models\User;
use App\Services\DeviceRegistry;
use App\Services\QueueService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('the public home page and queue API do not require login', function () {
    User::factory()->administrator()->create();

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

    $response->assertOk()
        ->assertJsonMissingPath('data.callable')
        ->assertJsonMissingPath('data.waiting.0.photo_path')
        ->assertJsonMissingPath('data.waiting.0.photo_url')
        ->assertJsonMissingPath('data.waiting.0.device_id');

    Event::assertDispatched(
        QueueChanged::class,
        fn (QueueChanged $event): bool => ! array_key_exists('callable', $event->state)
            && ! array_key_exists('photo_url', $event->state['waiting'][0] ?? []),
    );
});

test('a registered operator can privately load the current customer photo', function () {
    User::factory()->administrator()->create();

    Event::fake();
    Storage::fake('local');
    $operatorCredential = 'operator-secret';
    $operator = Device::factory()->roles(DeviceRole::OperatorTerminal)->create([
        'credential_hash' => hash('sha256', $operatorCredential),
    ]);
    $entry = app(QueueService::class)->take(
        UploadedFile::fake()->image('customer.jpg'),
        (string) Str::uuid(),
        $operator,
    );
    app(QueueService::class)->callNext('Loket 1', $operator);

    $photoUrl = route('operator.queue.photo', ['entry' => $entry->getKey()], false);
    $cookie = $operator->getKey().'.'.$operatorCredential;

    $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get(route('operator-terminal'))
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('operator-terminal')
                ->where('state.current.photo_url', $photoUrl),
        );

    $photoResponse = $this->withCookie(DeviceRegistry::COOKIE, $cookie)
        ->get($photoUrl)
        ->assertOk()
        ->assertHeader('Content-Type', 'image/jpeg');

    expect($photoResponse->headers->get('Cache-Control'))
        ->toContain('private')
        ->toContain('no-store');

    $displayCredential = 'display-secret';
    $display = Device::factory()->roles(DeviceRole::Display)->create([
        'credential_hash' => hash('sha256', $displayCredential),
    ]);

    $this->withCookie(DeviceRegistry::COOKIE, $display->getKey().'.'.$displayCredential)
        ->get(route('display'))
        ->assertInertia(
            fn (Assert $page): Assert => $page->missing('state.current.photo_url'),
        );

    $this->withCookie(DeviceRegistry::COOKIE, $display->getKey().'.'.$displayCredential)
        ->get($photoUrl)
        ->assertForbidden();

    $this->withCookie(DeviceRegistry::COOKIE, 'invalid')->get($photoUrl)->assertRedirect(route('pair'));
});

test('an unregistered device identity can view public content', function () {
    User::factory()->administrator()->create();

    $device = Device::factory()->unregistered()->create(['credential_hash' => hash('sha256', 'pending-secret')]);

    $response = $this->withCookie(DeviceRegistry::COOKIE, $device->id.'.pending-secret')->get('/');

    $response->assertOk();
});
