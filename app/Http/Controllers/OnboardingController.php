<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\OnboardingData;
use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class OnboardingController extends Controller
{
    public function create(): Response|RedirectResponse
    {
        if ($this->administratorExists()) {
            return redirect()->route('login');
        }

        $settings = Setting::current();

        return Inertia::render('onboarding', [
            'defaults' => [
                'brandName' => $settings->brand_name,
                'sessionName' => $settings->session_name,
                'defaultPrefix' => $settings->default_prefix,
                'numberDigits' => $settings->number_digits,
                'numberCounters' => $settings->number_counters,
            ],
        ]);
    }

    public function store(OnboardingData $data, Request $request, AuditLogger $audit): RedirectResponse
    {
        $administrator = DB::transaction(function () use ($data, $audit): ?User {
            $settings = Setting::query()->whereKey(1)->lockForUpdate()->firstOrFail();

            if ($this->administratorExists()) {
                return null;
            }

            $administrator = User::query()->create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
                'role' => UserRole::Administrator,
            ]);

            $settings->update([
                'brand_name' => $data->brandName,
                'session_name' => $data->sessionName,
                'default_prefix' => $data->defaultPrefix,
                'number_digits' => $data->numberDigits,
                'number_counters' => $data->numberCounters,
            ]);

            $audit->record('user.created', user: $administrator, subject: $administrator);
            $audit->record(
                'queue.settings.updated',
                user: $administrator,
                subject: $settings,
                metadata: [
                    'brand_name' => $data->brandName,
                    'session_name' => $data->sessionName,
                    'default_prefix' => $data->defaultPrefix,
                    'number_digits' => $data->numberDigits,
                    'number_counters' => $data->numberCounters,
                ],
            );

            return $administrator;
        });

        if (! $administrator instanceof User) {
            return redirect()->route('login')->with('success', 'Administrator sudah terdaftar.');
        }

        Auth::login($administrator);
        $request->session()->regenerate();

        return redirect()->route('admin.index')->with('success', 'Antre siap digunakan.');
    }

    private function administratorExists(): bool
    {
        return User::query()->where('role', UserRole::Administrator->value)->exists();
    }
}
