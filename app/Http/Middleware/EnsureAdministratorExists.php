<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAdministratorExists
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/*') || $request->is('up') || $request->is('onboarding') || $request->routeIs('onboarding*')) {
            return $next($request);
        }

        if (! User::query()->where('role', UserRole::Administrator->value)->exists()) {
            return to_route('onboarding');
        }

        return $next($request);
    }
}
