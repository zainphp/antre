<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Data\Frontend\AuthData;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => AuthData::fromUser($user instanceof User ? $user : null)->toArray(),
            'flash' => [
                'success' => fn (): ?string => $this->flashMessage($request, 'success'),
                'error' => fn (): ?string => $this->flashMessage($request, 'error'),
            ],
        ];
    }

    private function flashMessage(Request $request, string $key): ?string
    {
        $value = $request->session()->get($key);

        return is_string($value) ? $value : null;
    }
}
