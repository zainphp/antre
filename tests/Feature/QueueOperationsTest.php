<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Enums\QueueStatus;
use App\Events\QueueChanged;
use App\Exceptions\QueueConflictException;
use App\Models\Device;
use App\Models\QueueSession;
use App\Models\Setting;
use App\Services\QueueService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

test('queue numbers are sequential and taking a number is idempotent', function () {
    Event::fake([QueueChanged::class]);
    Storage::fake('local');
    $device = Device::factory()->unregistered()->create();
    $queues = app(QueueService::class);
    $requestId = (string) Str::uuid();

    $first = $queues->take(null, $requestId, $device);
    $same = $queues->take(null, $requestId, $device);
    $second = $queues->take(null, (string) Str::uuid(), $device);

    expect($first->number)->toBe('001')
        ->and($same->id)->toBe($first->id)
        ->and($second->number)->toBe('002')
        ->and($first->fresh()->status)->toBe(QueueStatus::Waiting);

    Event::assertDispatched(QueueChanged::class);
});

test('call next is serialized per counter while counters stay active independently', function () {
    Event::fake([QueueChanged::class]);
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    Setting::current()->update(['number_counters' => 2]);
    $queues = app(QueueService::class);
    $queues->take(null, (string) Str::uuid());
    $queues->take(null, (string) Str::uuid());
    $queues->take(null, (string) Str::uuid());

    $called = $queues->callNext('Loket 1', $device);
    $otherCounter = $queues->callNext('Loket 2', $device);

    expect($called->number)->toBe('001')
        ->and($otherCounter->number)->toBe('002')
        ->and($called->fresh()->status)->toBe(QueueStatus::Called)
        ->and($otherCounter->fresh()->status)->toBe(QueueStatus::Called)
        ->and(fn () => $queues->callNext('Loket 1', $device))
        ->toThrow(QueueConflictException::class, 'Selesaikan nomor');

    $queues->startServing($device, 'Loket 1');
    $queues->complete($device, 'Loket 1');
    $next = $queues->callNext('Loket 1', $device);

    expect($next->number)->toBe('003')
        ->and($next->status)->toBe(QueueStatus::Called)
        ->and($otherCounter->fresh()->status)->toBe(QueueStatus::Called)
        ->and($queues->state()['current']['number'])->toBe($next->number);
});

test('an active number cannot be called from another counter', function () {
    Event::fake([QueueChanged::class]);
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    Setting::current()->update(['number_counters' => 2]);
    $queues = app(QueueService::class);
    $entry = $queues->take(null, (string) Str::uuid());

    $queues->callNext('Loket 1', $device);

    expect(fn () => $queues->recall('Loket 2', $entry->id, $device))
        ->toThrow(QueueConflictException::class, 'Loket 1');
});

test('call next only accepts configured counters', function () {
    Event::fake([QueueChanged::class]);
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);
    $queues->take(null, (string) Str::uuid());

    expect(fn () => $queues->callNext('Loket 2', $device))
        ->toThrow(QueueConflictException::class, 'tidak tersedia');

    Setting::current()->update(['number_counters' => 2]);
    $called = $queues->callNext('Loket 2', $device);

    expect($called->counter?->name)->toBe('Loket 2');
});

test('operators can recall any unfinished number', function () {
    Event::fake([QueueChanged::class]);
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);
    $first = $queues->take(null, (string) Str::uuid());
    $second = $queues->take(null, (string) Str::uuid());
    $waiting = $queues->take(null, (string) Str::uuid());
    $queues->callNext('Loket 1', $device);

    expect($queues->state(includeCallable: true)['callable'])->toHaveCount(3);

    $recalled = $queues->recall('Loket 1', $second->id, $device);

    expect($recalled->id)->toBe($second->id)
        ->and($recalled->status)->toBe(QueueStatus::Called)
        ->and($recalled->completed_at)->toBeNull()
        ->and($first->fresh()->status)->toBe(QueueStatus::Skipped)
        ->and($queues->state()['current']['number'])->toBe($second->number)
        ->and($queues->state(includeCallable: true)['callable'])->toHaveCount(3);

    $queues->startServing($device);
    $queues->complete($device);
    Setting::current()->update(['number_counters' => 2]);
    $recalledWaiting = $queues->recall('Loket 2', $waiting->id, $device);

    expect($recalledWaiting->id)->toBe($waiting->id)
        ->and($recalledWaiting->counter?->name)->toBe('Loket 2')
        ->and($first->fresh()->status)->toBe(QueueStatus::Skipped)
        ->and($second->fresh()->status)->toBe(QueueStatus::Completed);
});

test('reset archives the current session and starts numbering again', function () {
    Event::fake([QueueChanged::class]);
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);
    $first = $queues->take(null, (string) Str::uuid());

    $newSession = $queues->reset($device);
    $next = $queues->take(null, (string) Str::uuid());

    expect($newSession->exists)->toBeTrue()
        ->and($next->number)->toBe('001')
        ->and(QueueSession::findOrFail($first->queue_session_id)->entries()->where('status', QueueStatus::Skipped)->count())->toBe(1);
});

test('queue photos remain until the operator resets the session', function () {
    Event::fake([QueueChanged::class]);
    Storage::fake('local');
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);
    $completed = $queues->take(UploadedFile::fake()->image('completed.jpg'), (string) Str::uuid());
    $skipped = $queues->take(UploadedFile::fake()->image('skipped.jpg'), (string) Str::uuid());

    $queues->callNext('Loket 1', $device);
    $queues->complete($device);
    $queues->callNext('Loket 1', $device);
    $queues->skip($device);

    $completedPath = $completed->fresh()->photo_path;
    $skippedPath = $skipped->fresh()->photo_path;

    expect($completedPath)->not->toBeNull()
        ->and($skippedPath)->not->toBeNull();

    if ($completedPath === null || $skippedPath === null) {
        return;
    }

    Storage::disk('local')->assertExists($completedPath);
    Storage::disk('local')->assertExists($skippedPath);

    $queues->reset($device);

    expect($completed->fresh()->photo_path)->toBeNull()
        ->and($skipped->fresh()->photo_path)->toBeNull();
    Storage::disk('local')->assertMissing($completedPath);
    Storage::disk('local')->assertMissing($skippedPath);
});
