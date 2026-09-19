<?php

namespace App\Http\Middleware;

use App\Enums\DeviceStatus;
use App\Services\DeviceRegistry;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateDevice
{
    public function __construct(private readonly DeviceRegistry $registry) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $device = $this->registry->resolve($request);
        if (! $device || $device->status === DeviceStatus::Revoked) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Perangkat belum terdaftar.'], 401);
            }

            return redirect()->route('pair')->with('error', 'Hubungkan perangkat ini terlebih dahulu.');
        }

        $this->registry->touch($device);
        $request->attributes->set('device', $device);

        return $next($request);
    }
}
