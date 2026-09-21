<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\UpdateQueueSettingsData;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class QueueSettingsController extends Controller
{
    public function edit(): Response
    {
        $settings = Setting::current();

        return Inertia::render('admin/settings', [
            'defaultPrefix' => $settings->default_prefix,
            'numberDigits' => $settings->number_digits,
            'footerLinks' => $settings->footerLinks(),
        ]);
    }

    public function update(UpdateQueueSettingsData $data, #[CurrentUser] User $user, AuditLogger $audit): RedirectResponse
    {
        $settings = Setting::current();
        $settings->update([
            'default_prefix' => $data->defaultPrefix,
            'number_digits' => $data->numberDigits,
            'footer_links' => $data->footerLinks,
        ]);
        $audit->record(
            'queue.settings.updated',
            user: $user,
            subject: $settings,
            metadata: [
                'default_prefix' => $data->defaultPrefix,
                'number_digits' => $data->numberDigits,
                'footer_links' => $data->footerLinks,
            ],
        );

        return back()->with('success', 'Pengaturan antrian berhasil disimpan.');
    }
}
