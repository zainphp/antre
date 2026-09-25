<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Events\SettingsChanged;
use App\Models\Device;
use App\Models\Setting;
use App\Models\User;
use App\Services\DeviceRegistry;
use App\Services\QueueService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('only administrators can view and update queue settings', function () {
    Event::fake([SettingsChanged::class]);
    $settings = route('admin.settings');

    $this->get($settings)->assertRedirect(route('onboarding'));

    User::factory()->administrator()->create();
    $this->actingAs(User::factory()->create())->get($settings)->assertForbidden();

    $admin = User::factory()->administrator()->create();
    $this->actingAs($admin)->get($settings)->assertOk();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => 'B',
            'number_digits' => 4,
            'number_counters' => 1,
            'photo_required' => false,
        ])
        ->assertRedirect();

    expect(Setting::current()->default_prefix)->toBe('B')
        ->and(Setting::current()->number_digits)->toBe(4)
        ->and(Setting::current()->number_counters)->toBe(1);

    Event::assertDispatched(SettingsChanged::class);
});

test('administrators can configure public footer links', function () {
    $admin = User::factory()->administrator()->create();
    $links = [
        ['label' => 'Website', 'url' => 'https://example.com'],
        ['label' => 'Dokumentasi', 'url' => 'https://docs.example.com'],
    ];

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => null,
            'number_digits' => 3,
            'number_counters' => 1,
            'photo_required' => false,
            'footer_links' => $links,
        ])
        ->assertRedirect();

    expect(Setting::current()->footerLinks())->toBe($links);

    $this->get('/')->assertInertia(
        fn (Assert $page): Assert => $page
            ->component('welcome')
            ->where('footerLinks', $links),
    );
});

test('administrators can configure the public brand and session name', function () {
    $admin = User::factory()->administrator()->create();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'Layanan Kita',
            'session_name' => 'Pelayanan Warga',
            'default_prefix' => null,
            'number_digits' => 3,
            'number_counters' => 1,
            'photo_required' => false,
            'footer_links' => [],
        ])
        ->assertRedirect();

    expect(Setting::current()->brand_name)->toBe('Layanan Kita')
        ->and(Setting::current()->session_name)->toBe('Pelayanan Warga');

    $this->get('/')->assertInertia(
        fn (Assert $page): Assert => $page
            ->component('welcome')
            ->where('brandName', 'Layanan Kita')
            ->where('state.session.service_name', 'Pelayanan Warga'),
    );
});

test('administrators can configure the number of operator counters', function () {
    $admin = User::factory()->administrator()->create();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => null,
            'number_digits' => 3,
            'number_counters' => 3,
            'photo_required' => false,
            'footer_links' => [],
        ])
        ->assertRedirect();

    expect(Setting::current()->number_counters)->toBe(3);

    $credential = 'operator-secret';
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create([
        'credential_hash' => hash('sha256', $credential),
    ]);

    $this->withCookie(DeviceRegistry::COOKIE, $device->id.'.'.$credential)
        ->get(route('operator-terminal'))
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('operator-terminal')
                ->where('counters', ['Loket 1', 'Loket 2', 'Loket 3']),
        );
});

test('administrators can require customer photos', function () {
    $admin = User::factory()->administrator()->create();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => null,
            'number_digits' => 3,
            'number_counters' => 1,
            'photo_required' => true,
            'footer_links' => [],
        ])
        ->assertRedirect();

    expect(Setting::current()->photo_required)->toBeTrue();
});

test('queue terminals receive the configured brand, session, and photo requirement', function () {
    User::factory()->administrator()->create();
    Setting::current()->update([
        'brand_name' => 'Koperasi Kita',
        'session_name' => 'Pelayanan Warga',
        'photo_required' => true,
    ]);
    $credential = 'queue-terminal-settings-secret';
    $device = Device::factory()->roles(DeviceRole::QueueTerminal)->create([
        'credential_hash' => hash('sha256', $credential),
    ]);

    $this->withCookie(DeviceRegistry::COOKIE, $device->id.'.'.$credential)
        ->get(route('queue-terminal'))
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('queue-terminal')
                ->where('brandName', 'Koperasi Kita')
                ->where('sessionName', 'Pelayanan Warga')
                ->where('photoRequired', true),
        );

    $this->withCookie(DeviceRegistry::COOKIE, $device->id.'.'.$credential)
        ->get(route('queue-terminal.settings'))
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('queue-terminal-settings')
                ->where('brandName', 'Koperasi Kita')
                ->where('sessionName', 'Pelayanan Warga'),
        );
});

test('brand and session names cannot be empty', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'brand_name' => ' ',
        'session_name' => '',
        'default_prefix' => null,
        'number_digits' => 3,
        'number_counters' => 1,
        'photo_required' => false,
        'footer_links' => [],
    ]);

    $response->assertSessionHasErrors(['brand_name', 'session_name']);
    expect(Setting::current()->brand_name)->toBe('ANTRE')
        ->and(Setting::current()->session_name)->toBe('Pelayanan Pelanggan');
});

test('a nullable default prefix formats new queue numbers without a separator', function () {
    $admin = User::factory()->administrator()->create();
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = resolve(QueueService::class);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('001');
    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => 'B',
            'number_digits' => 4,
            'number_counters' => 1,
            'photo_required' => false,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('B0001');

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'brand_name' => 'ANTRE',
            'session_name' => 'Pelayanan Pelanggan',
            'default_prefix' => '',
            'number_digits' => 2,
            'number_counters' => 1,
            'photo_required' => false,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect(Setting::current()->default_prefix)->toBeNull()
        ->and($queues->take(null, (string) Str::uuid())->number)->toBe('01');
});

test('a default prefix rejects separators and unsupported characters', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'brand_name' => 'ANTRE',
        'session_name' => 'Pelayanan Pelanggan',
        'default_prefix' => 'A-',
        'number_digits' => 3,
        'number_counters' => 1,
        'photo_required' => false,
    ]);

    $response->assertSessionHasErrors('default_prefix');
    expect(Setting::current()->default_prefix)->toBeNull();
});

test('number digits must be between one and six', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'brand_name' => 'ANTRE',
        'session_name' => 'Pelayanan Pelanggan',
        'default_prefix' => null,
        'number_digits' => 7,
        'number_counters' => 1,
        'photo_required' => false,
    ]);

    $response->assertSessionHasErrors('number_digits');
    expect(Setting::current()->number_digits)->toBe(3);
});

test('footer links only accept external http urls', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'brand_name' => 'ANTRE',
        'session_name' => 'Pelayanan Pelanggan',
        'default_prefix' => null,
        'number_digits' => 3,
        'number_counters' => 1,
        'photo_required' => false,
        'footer_links' => [
            ['label' => 'Unsafe', 'url' => 'javascript:alert(1)'],
        ],
    ]);

    $response->assertSessionHasErrors('footer_links.0.url');
    expect(Setting::current()->footerLinks())->toBe([]);
});
