<?php

declare(strict_types=1);

use App\Events\IntegrationTested;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Sentry\EventId;
use Sentry\Laravel\Facade as Sentry;

test('only administrators can view the integration page', function () {
    $this->get(route('admin.integrations'))->assertRedirect(route('onboarding'));

    $operator = User::factory()->create();
    $administrator = User::factory()->administrator()->create();

    $this->actingAs($operator)
        ->get(route('admin.integrations'))
        ->assertForbidden();

    $this->actingAs($administrator)
        ->get(route('admin.integrations'))
        ->assertOk();
});

test('an administrator can send a backend Sentry test message', function () {
    config(['sentry.dsn' => 'https://example.invalid/1']);
    $administrator = User::factory()->administrator()->create();

    Sentry::shouldReceive('captureMessage')
        ->once()
        ->withArgs(fn (string $message): bool => str_starts_with($message, 'Antre integration test: backend Sentry'))
        ->andReturn(EventId::generate());
    Sentry::shouldReceive('getClient')->andReturn(null);
    Sentry::shouldReceive('getTransaction')->andReturn(null);

    $response = $this->actingAs($administrator)
        ->postJson(route('admin.integrations.sentry.backend'));

    $response
        ->assertOk()
        ->assertJsonPath('message', 'Pesan uji backend Sentry telah dikirim.')
        ->assertJsonStructure(['event_id']);
});

test('an administrator receives a clear response when backend Sentry is not configured', function () {
    config(['sentry.dsn' => null]);
    $administrator = User::factory()->administrator()->create();

    $response = $this->actingAs($administrator)
        ->postJson(route('admin.integrations.sentry.backend'));

    $response
        ->assertServiceUnavailable()
        ->assertJsonPath('message', 'Sentry backend belum dikonfigurasi.');
});

test('an administrator can send a realtime test through each broadcaster', function (string $connection) {
    config(["broadcasting.connections.{$connection}.key" => 'test-key']);
    Event::fake([IntegrationTested::class]);
    $administrator = User::factory()->administrator()->create();

    $response = $this->actingAs($administrator)
        ->postJson(route('admin.integrations.broadcast', $connection));

    $response
        ->assertOk()
        ->assertJsonPath('connection', $connection)
        ->assertJsonStructure(['test_id']);

    Event::assertDispatched(fn (IntegrationTested $event): bool => $event->broadcastConnections() === [$connection]
        && $event->connection === $connection);
})->with(['ably', 'reverb']);

test('non administrators cannot send integration tests', function () {
    User::factory()->administrator()->create();
    $operator = User::factory()->create();

    $this->actingAs($operator)
        ->postJson(route('admin.integrations.broadcast', 'ably'))
        ->assertForbidden();
});
