<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\DeviceRole;
use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureDeviceRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $device = $request->attributes->get('device');
        $requiredRole = DeviceRole::tryFrom($role);

        if (! $device instanceof Device || ! $requiredRole || ! $device->isAssigned() || ! $device->hasRole($requiredRole)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Peran perangkat tidak diizinkan.'], 403);
            }

            abort(403, 'Peran perangkat tidak diizinkan.');
        }

        return $next($request);
    }
}
