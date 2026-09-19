<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user instanceof User || ! in_array($user->role->value, $roles, true)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Anda tidak memiliki izin untuk tindakan ini.'], 403);
            }

            abort(403, 'Anda tidak memiliki izin untuk tindakan ini.');
        }

        return $next($request);
    }
}
