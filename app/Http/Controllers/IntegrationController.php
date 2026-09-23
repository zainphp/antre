<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\IntegrationTested;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Sentry\Laravel\Facade as Sentry;
use Throwable;

final class IntegrationController extends Controller
{
    public function index(): Response
    {
        $broadcastConnection = config('broadcasting.default');

        return Inertia::render('admin/integrations', [
            'sentryBackendConfigured' => filled(config('sentry.dsn')),
            'broadcastConnection' => is_string($broadcastConnection)
                ? $broadcastConnection
                : null,
        ]);
    }

    public function testBackendSentry(): JsonResponse
    {
        if (! filled(config('sentry.dsn'))) {
            return response()->json([
                'message' => 'Sentry backend belum dikonfigurasi.',
            ], 503);
        }

        $eventId = Sentry::captureMessage(
            'Antre integration test: backend Sentry ['.Str::uuid().']',
        );

        return response()->json([
            'message' => 'Pesan uji backend Sentry telah dikirim.',
            'event_id' => $eventId === null ? null : (string) $eventId,
        ]);
    }

    public function testBroadcast(string $connection): JsonResponse
    {
        if (! in_array($connection, ['ably', 'reverb'], true)) {
            abort(404);
        }

        if (! filled(config("broadcasting.connections.{$connection}.key"))) {
            return response()->json([
                'message' => "Broadcaster {$connection} belum dikonfigurasi.",
            ], 503);
        }

        $testId = (string) Str::uuid();

        try {
            broadcast(new IntegrationTested($testId, $connection))->via($connection);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => "Uji broadcaster {$connection} gagal dikirim.",
            ], 503);
        }

        return response()->json([
            'message' => "Pesan uji {$connection} telah dikirim.",
            'test_id' => $testId,
            'connection' => $connection,
        ]);
    }
}
