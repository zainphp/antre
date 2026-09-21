<?php

declare(strict_types=1);

use App\Enums\DeviceRole;
use App\Models\Device;
use App\Models\Setting;
use App\Models\User;
use App\Services\QueueService;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('only administrators can view and update queue settings', function () {
    $settings = route('admin.settings');

    $this->get($settings)->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get($settings)->assertForbidden();

    $admin = User::factory()->administrator()->create();
    $this->actingAs($admin)->get($settings)->assertOk();

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => 'B',
            'number_digits' => 4,
        ])
        ->assertRedirect();

    expect(Setting::current()->default_prefix)->toBe('B')
        ->and(Setting::current()->number_digits)->toBe(4);
});

test('administrators can configure public footer links', function () {
    $admin = User::factory()->administrator()->create();
    $links = [
        ['label' => 'Website', 'url' => 'https://example.com'],
        ['label' => 'Dokumentasi', 'url' => 'https://docs.example.com'],
    ];

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => null,
            'number_digits' => 3,
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

test('a nullable default prefix formats new queue numbers without a separator', function () {
    $admin = User::factory()->administrator()->create();
    $device = Device::factory()->roles(DeviceRole::OperatorTerminal)->create();
    $queues = app(QueueService::class);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('001');
    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => 'B',
            'number_digits' => 4,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect($queues->take(null, (string) Str::uuid())->number)->toBe('B0001');

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_prefix' => '',
            'number_digits' => 2,
        ])
        ->assertRedirect();
    $queues->reset($device);

    expect(Setting::current()->default_prefix)->toBeNull()
        ->and($queues->take(null, (string) Str::uuid())->number)->toBe('01');
});

test('a default prefix rejects separators and unsupported characters', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'default_prefix' => 'A-',
        'number_digits' => 3,
    ]);

    $response->assertSessionHasErrors('default_prefix');
    expect(Setting::current()->default_prefix)->toBeNull();
});

test('number digits must be between one and six', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'default_prefix' => null,
        'number_digits' => 7,
    ]);

    $response->assertSessionHasErrors('number_digits');
    expect(Setting::current()->number_digits)->toBe(3);
});

test('footer links only accept external http urls', function () {
    $admin = User::factory()->administrator()->create();

    $response = $this->actingAs($admin)->patch(route('admin.settings.update'), [
        'default_prefix' => null,
        'number_digits' => 3,
        'footer_links' => [
            ['label' => 'Unsafe', 'url' => 'javascript:alert(1)'],
        ],
    ]);

    $response->assertSessionHasErrors('footer_links.0.url');
    expect(Setting::current()->footerLinks())->toBe([]);
});
